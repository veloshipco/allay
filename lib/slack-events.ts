import crypto from 'crypto'
import { initializeDatabase } from './database/config'
import { Conversation, SlackMessage } from './database/entities/Conversation'
import { createSlackClient, getOrCreateSlackUser, fetchChannelInfo } from './slack-api'
import { getTenantContext } from './tenant'

interface SlackEvent {
  ts: string
  user: string
  text?: string
  channel: string
  channel_name?: string
  username?: string
  thread_ts?: string
  bot_id?: string
  subtype?: string
  type: string
}

interface SlackReactionEvent {
  reaction: string
  user: string
  item: {
    ts: string
    channel: string
  }
}

// Import the SSE broadcast function
async function broadcastToSSE(tenantId: string, type: string, data?: Record<string, unknown>) {
  try {
    // Dynamic import to avoid circular dependencies
    const { broadcastConversationUpdate } = await import('../app/api/[tenantId]/conversations/stream/route')
    broadcastConversationUpdate(tenantId, { type, ...(data || {}) })
  } catch (error) {
    console.error('Failed to broadcast SSE update:', error)
  }
}

export async function verifySlackSignature(
  body: string,
  timestamp: string | null,
  signature: string | null,
  signingSecret: string
): Promise<boolean> {
  try {
    if (!timestamp || !signature) {
      return false
    }

    // Check if request is too old (more than 5 minutes)
    const currentTime = Math.floor(Date.now() / 1000)
    if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
      return false
    }

    const baseString = `v0:${timestamp}:${body}`
    const expectedSignature = `v0=${crypto
      .createHmac('sha256', signingSecret)
      .update(baseString)
      .digest('hex')}`

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch (error) {
    console.error('Error verifying Slack signature:', error)
    return false
  }
}

export async function processMessageEvent(tenantId: string, event: SlackEvent) {
  console.log('💾 processMessageEvent called:', { tenantId, eventTs: event.ts, channel: event.channel })
  
  try {
    // Skip bot messages and message subtypes we don't want to store
    if (event.bot_id || event.subtype === 'bot_message') {
      console.log('⏭️ Skipping bot message in processMessageEvent')
      return
    }

    console.log('🔌 Connecting to database...')
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)

    console.log('🔍 Checking if conversation already exists...')
    // Check if conversation already exists
    const existingConversation = await conversationRepository.findOne({
      where: { id: event.ts, tenantId }
    })

    if (existingConversation) {
      console.log('⚠️ Message already processed:', event.ts)
      return // Message already processed
    }

    // Get tenant context and create Slack client
    const { tenant } = await getTenantContext(tenantId)
    if (!tenant?.slackConfig?.botToken) {
      console.error('❌ No bot token found for tenant:', tenantId)
      return
    }

    const slackClient = await createSlackClient(tenant.slackConfig.botToken)

    // Resolve user information
    console.log('👤 Resolving user information...')
    const slackUser = await getOrCreateSlackUser(tenantId, event.user, slackClient)
    
    // Get channel information
    console.log('📺 Fetching channel information...')
    const channelInfo = await fetchChannelInfo(slackClient, event.channel)

    console.log('✨ Creating new conversation record...')
    // Create new conversation record with enhanced user and channel data
    const conversation = conversationRepository.create({
      id: event.ts,
      tenantId,
      channelId: event.channel,
      channelName: channelInfo?.name || event.channel_name || undefined,
      content: event.text || '',
      userId: event.user,
      userName: slackUser?.realName || slackUser?.displayName || event.username || undefined,
      threadTs: event.thread_ts || undefined,
      slackTimestamp: new Date(parseFloat(event.ts) * 1000),
      reactions: [],
      threadReplies: []
    })

    console.log('📝 Conversation object created:', {
      id: conversation.id,
      tenantId: conversation.tenantId,
      channelId: conversation.channelId,
      channelName: conversation.channelName,
      userName: conversation.userName,
      content: conversation.content.substring(0, 50) + '...'
    })

    console.log('💾 Saving to database...')
    await conversationRepository.save(conversation)
    console.log(`✅ Successfully saved message ${event.ts} for tenant ${tenantId}`)

    // Broadcast real-time update
    console.log('📡 Broadcasting real-time update...')
    await broadcastToSSE(tenantId, 'new_message', {
      conversationId: conversation.id,
      channelId: conversation.channelId,
      channelName: conversation.channelName,
      content: conversation.content,
      userName: conversation.userName,
      timestamp: conversation.slackTimestamp.toISOString()
    })
  } catch (error) {
    console.error('💥 Error processing message event:', error)
    throw error
  }
}

export async function processReactionEvent(tenantId: string, event: SlackReactionEvent, isRemoval = false) {
  try {
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)

    // Find the conversation this reaction belongs to
    const conversation = await conversationRepository.findOne({
      where: { id: event.item.ts, tenantId }
    })

    if (!conversation) {
      console.log(`Conversation ${event.item.ts} not found for reaction event`)
      return
    }

    // Get tenant context for user resolution
    const { tenant } = await getTenantContext(tenantId)
    if (tenant?.slackConfig?.botToken) {
      const slackClient = await createSlackClient(tenant.slackConfig.botToken)
      // Ensure the reacting user is tracked
      await getOrCreateSlackUser(tenantId, event.user, slackClient)
    }

    // Update reactions
    const reactions = [...conversation.reactions]
    const existingReactionIndex = reactions.findIndex(r => r.name === event.reaction)

    if (isRemoval) {
      if (existingReactionIndex >= 0) {
        const reaction = reactions[existingReactionIndex]
        reaction.users = reaction.users.filter(u => u !== event.user)
        reaction.count = reaction.users.length
        
        if (reaction.count === 0) {
          reactions.splice(existingReactionIndex, 1)
        }
      }
    } else {
      if (existingReactionIndex >= 0) {
        const reaction = reactions[existingReactionIndex]
        if (!reaction.users.includes(event.user)) {
          reaction.users.push(event.user)
          reaction.count = reaction.users.length
        }
      } else {
        reactions.push({
          name: event.reaction,
          users: [event.user],
          count: 1
        })
      }
    }

    conversation.reactions = reactions
    await conversationRepository.save(conversation)
    
    console.log(`Updated reactions for message ${event.item.ts} in tenant ${tenantId}`)

    // Broadcast reaction update
    await broadcastToSSE(tenantId, 'reaction_update', {
      conversationId: conversation.id,
      reaction: event.reaction,
      isRemoval,
      user: event.user
    })
  } catch (error) {
    console.error('Error processing reaction event:', error)
  }
}

// Helper function to process thread reply events (creates separate conversation record)
export async function processThreadReplyEvent(tenantId: string, event: SlackEvent) {
  try {
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)
    
    // Find the parent conversation
    const parentConversation = await conversationRepository.findOne({
      where: { id: event.thread_ts, tenantId }
    })

    if (!parentConversation) {
      console.warn('Parent conversation not found for thread reply:', event.thread_ts)
      return
    }

    // Create thread reply as separate conversation record
    const threadReplyConversation = conversationRepository.create({
      id: event.ts,
      tenantId,
      channelId: event.channel,
      channelName: parentConversation.channelName, // Use parent's channel name
      content: event.text || '',
      userId: event.user,
      userName: event.user, // Will be updated when we get user info
      threadTs: event.thread_ts, // This links it to the parent
      slackTimestamp: new Date(parseFloat(event.ts) * 1000),
      reactions: [],
      threadReplies: []
    })

    await conversationRepository.save(threadReplyConversation)

    // Add to parent conversation's threadReplies array
    const threadReply: SlackMessage = {
      type: 'message',
      ts: event.ts,
      user: event.user,
      text: event.text || '',
      thread_ts: event.thread_ts
    }

    const updatedThreadReplies = [...parentConversation.threadReplies]
    
    // Check if reply already exists
    const existingReplyIndex = updatedThreadReplies.findIndex(r => r.ts === event.ts)
    if (existingReplyIndex < 0) {
      updatedThreadReplies.push(threadReply)
      parentConversation.threadReplies = updatedThreadReplies
      await conversationRepository.save(parentConversation)
    }

    // Broadcast SSE update for the new thread reply
    try {
      const sseModule = await import('../app/api/[tenantId]/conversations/stream/route')
      await sseModule.broadcastConversationUpdate(tenantId, {
        type: 'new_thread_reply',
        conversationId: threadReplyConversation.id,
        parentConversationId: parentConversation.id,
        content: event.text || '',
        userName: event.user,
        timestamp: threadReplyConversation.slackTimestamp.toISOString()
      })
    } catch (sseError) {
      console.warn('Could not broadcast SSE update for thread reply:', sseError)
    }

  } catch (error) {
    console.error('Error processing thread reply event:', error)
  }
}

export async function processAppUninstalledEvent(tenantId: string) {
  console.log(`🚫 Processing app uninstall event for tenant: ${tenantId}`)
  
  try {
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)
    const slackUserRepository = dataSource.getRepository('SlackUser')

    // Find the tenant
    const tenant = await dataSource.getRepository('Tenant').findOne({ 
      where: { id: tenantId, isActive: true } 
    })

    if (!tenant || !tenant.slackConfig) {
      console.log(`⚠️ Tenant ${tenantId} not found or not configured for Slack`)
      return
    }

    console.log(`🧹 Starting cleanup for tenant: ${tenantId}`)

    // Clear ALL Slack-related data
    try {
      // Delete all conversations for this tenant
      const deletedConversations = await conversationRepository.delete({ tenantId })
      console.log(`🗑️ Deleted ${deletedConversations.affected || 0} conversations for tenant: ${tenantId}`)
      
      // Delete all slack users for this tenant
      const deletedUsers = await slackUserRepository.delete({ tenantId })
      console.log(`🗑️ Deleted ${deletedUsers.affected || 0} Slack users for tenant: ${tenantId}`)
    } catch (error) {
      console.error('❌ Error clearing Slack data:', error)
      // Continue with config clearing even if data deletion fails
    }

    // Clear Slack configuration from tenant
    try {
      // Use raw SQL query to ensure the slackConfig is properly cleared
      await dataSource.query(
        'UPDATE tenants SET "slackConfig" = NULL WHERE id = $1',
        [tenantId]
      )
      
      // Verify the update
      const verifiedTenant = await dataSource.getRepository('Tenant').findOne({ 
        where: { id: tenantId },
        cache: false
      })
      
      if (verifiedTenant?.slackConfig) {
        throw new Error('Database update failed - slackConfig still exists')
      }
      
      console.log(`✅ Successfully cleared Slack configuration for tenant: ${tenantId}`)
    } catch (saveError) {
      console.error('❌ Error clearing tenant configuration:', saveError)
      throw saveError
    }

    // Broadcast real-time update about disconnection
    await broadcastToSSE(tenantId, 'app_uninstalled', {
      message: 'Slack app has been uninstalled from your workspace'
    })

    console.log(`✅ Successfully processed app uninstall for tenant: ${tenantId}`)
  } catch (error) {
    console.error('❌ Error processing app uninstall event:', error)
    throw error
  }
}

export async function processTokensRevokedEvent(tenantId: string, tokens: { oauth?: string[]; bot?: string[] }) {
  console.log(`🔒 Processing tokens revoked event for tenant: ${tenantId}`, tokens)
  
  try {
    const dataSource = await initializeDatabase()
    const slackUserRepository = dataSource.getRepository('SlackUser')

    // If bot token is revoked, clear everything
    if (tokens.bot && tokens.bot.length > 0) {
      console.log(`🤖 Bot token revoked, performing full cleanup for tenant: ${tenantId}`)
      await processAppUninstalledEvent(tenantId)
      return
    }

    // If only OAuth tokens are revoked, clean up user tokens
    if (tokens.oauth && tokens.oauth.length > 0) {
      console.log(`👥 User tokens revoked for tenant: ${tenantId}`)
      
      // Import TypeORM operators
      const { Not, IsNull } = await import('typeorm')
      
      // Clear all user tokens for this tenant
      const slackUsers = await slackUserRepository.find({
        where: { tenantId, userToken: Not(IsNull()) }
      })

      for (const slackUser of slackUsers) {
        slackUser.userToken = undefined
        slackUser.scopes = undefined
        slackUser.tokenExpiresAt = undefined
        await slackUserRepository.save(slackUser)
      }

      console.log(`🧹 Cleared ${slackUsers.length} user tokens for tenant: ${tenantId}`)
      
      // Broadcast update about user token revocation
      await broadcastToSSE(tenantId, 'user_tokens_revoked', {
        message: 'User authorization tokens have been revoked'
      })
    }
  } catch (error) {
    console.error('❌ Error processing tokens revoked event:', error)
    throw error
  }
} 