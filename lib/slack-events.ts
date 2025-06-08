import crypto from 'crypto'
import { initializeDatabase } from './database/config'
import { Conversation, SlackMessage } from './database/entities/Conversation'

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

    console.log('✨ Creating new conversation record...')
    // Create new conversation record
    const conversation = conversationRepository.create({
      id: event.ts,
      tenantId,
      channelId: event.channel,
      channelName: event.channel_name || undefined,
      content: event.text || '',
      userId: event.user,
      userName: event.username || undefined,
      threadTs: event.thread_ts || undefined,
      slackTimestamp: new Date(parseFloat(event.ts) * 1000),
      reactions: [],
      threadReplies: []
    })

    console.log('📝 Conversation object created:', {
      id: conversation.id,
      tenantId: conversation.tenantId,
      channelId: conversation.channelId,
      content: conversation.content
    })

    console.log('💾 Saving to database...')
    await conversationRepository.save(conversation)
    console.log(`✅ Successfully saved message ${event.ts} for tenant ${tenantId}`)
  } catch (error) {
    console.error('💥 Error processing message event:', error)
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack)
    }
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
  } catch (error) {
    console.error('Error processing reaction event:', error)
  }
}

export async function processThreadReplyEvent(tenantId: string, event: SlackEvent) {
  try {
    if (!event.thread_ts) {
      return // Not a thread reply
    }

    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)

    // Find the parent conversation
    const parentConversation = await conversationRepository.findOne({
      where: { id: event.thread_ts, tenantId }
    })

    if (!parentConversation) {
      console.log(`Parent conversation ${event.thread_ts} not found for thread reply`)
      return
    }

    // Add thread reply
    const threadReply: SlackMessage = {
      ts: event.ts,
      user: event.user,
      text: event.text || '',
      type: event.type,
      subtype: event.subtype,
      thread_ts: event.thread_ts
    }

    const threadReplies = [...parentConversation.threadReplies]
    
    // Check if reply already exists
    const existingReplyIndex = threadReplies.findIndex(r => r.ts === event.ts)
    if (existingReplyIndex >= 0) {
      return // Reply already processed
    }

    threadReplies.push(threadReply)
    parentConversation.threadReplies = threadReplies
    
    await conversationRepository.save(parentConversation)
    console.log(`Added thread reply ${event.ts} to conversation ${event.thread_ts} in tenant ${tenantId}`)
  } catch (error) {
    console.error('Error processing thread reply event:', error)
  }
} 