import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database/config'
import { Conversation, SlackMessage } from '@/lib/database/entities/Conversation'
import { getTenantContext } from '@/lib/tenant'
import { createSlackClient, getOrCreateSlackUser } from '@/lib/slack-api'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { 
      parentConversationId, 
      messageText, 
      messageTs, 
      userId,
      channelId 
    } = await request.json()
    
    if (!parentConversationId || !messageText || !messageTs) {
      return NextResponse.json(
        { error: 'Missing required fields: parentConversationId, messageText, messageTs' },
        { status: 400 }
      )
    }

    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)
    
    // Find the parent conversation
    const parentConversation = await conversationRepository.findOne({
      where: { id: parentConversationId, tenantId }
    })
    
    if (!parentConversation) {
      return NextResponse.json(
        { error: 'Parent conversation not found' },
        { status: 404 }
      )
    }

    // Get user information - try to resolve from Slack API first
    const { tenant } = await getTenantContext(tenantId)
    let userName: string | undefined
    let resolvedUserId = userId
    
    if (tenant?.slackConfig?.botToken) {
      try {
        const slackClient = await createSlackClient(tenant.slackConfig.botToken)
        
        // If we don't have a userId, we might need to get it from the messageTs
        // For now, we'll use the provided userId or fallback to a default
        if (userId && userId !== 'current_user') {
          const slackUser = await getOrCreateSlackUser(tenantId, userId, slackClient)
          userName = slackUser?.realName || slackUser?.displayName
        } else {
          // If userId is 'current_user', we need to handle this differently
          // For now, let's use a fallback approach
          resolvedUserId = 'bot_user' // or some other identifier
          userName = 'Dashboard User'
        }
      } catch (error) {
        console.warn('Could not resolve user info:', error)
        resolvedUserId = userId || 'unknown'
        userName = 'Unknown User'
      }
    } else {
      resolvedUserId = userId || 'unknown'
      userName = 'Unknown User'
    }

    // 1. Create thread reply as separate conversation record
    const threadReplyConversation = conversationRepository.create({
      id: messageTs,
      tenantId,
      channelId: channelId || parentConversation.channelId,
      channelName: parentConversation.channelName,
      content: messageText,
      userId: resolvedUserId,
      userName: userName,
      threadTs: parentConversationId, // This links it to the parent
      slackTimestamp: new Date(parseFloat(messageTs) * 1000),
      reactions: [],
      threadReplies: []
    })

    await conversationRepository.save(threadReplyConversation)

    // 2. Add to parent conversation's threadReplies array
    const threadReply: SlackMessage = {
      type: 'message',
      ts: messageTs,
      user: resolvedUserId,
      text: messageText,
      thread_ts: parentConversationId
    }

    const updatedThreadReplies = [...parentConversation.threadReplies]
    
    // Check if reply already exists in parent's threadReplies
    const existingReplyIndex = updatedThreadReplies.findIndex(r => r.ts === messageTs)
    if (existingReplyIndex < 0) {
      updatedThreadReplies.push(threadReply)
      parentConversation.threadReplies = updatedThreadReplies
      await conversationRepository.save(parentConversation)
    }

    // 3. Broadcast SSE update
    try {
      const { broadcastConversationUpdate } = await import('../stream/route')
      await broadcastConversationUpdate(tenantId, {
        type: 'new_thread_reply',
        conversationId: threadReplyConversation.id,
        parentConversationId: parentConversation.id,
        content: messageText,
        userName: userName,
        timestamp: threadReplyConversation.slackTimestamp.toISOString()
      })
    } catch (error) {
      console.warn('Could not broadcast SSE update:', error)
    }

    return NextResponse.json({
      success: true,
      threadReply: {
        id: threadReplyConversation.id,
        content: threadReplyConversation.content,
        userName: threadReplyConversation.userName,
        timestamp: threadReplyConversation.slackTimestamp.toISOString(),
        threadTs: threadReplyConversation.threadTs
      }
    })

  } catch (error) {
    console.error('🧵 Error storing thread reply:', error)
    return NextResponse.json(
      { error: 'Failed to store thread reply' },
      { status: 500 }
    )
  }
} 