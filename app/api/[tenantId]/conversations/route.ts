import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database/config'
import { Conversation } from '@/lib/database/entities/Conversation'
import { SlackUser } from '@/lib/database/entities/SlackUser'
import { SlackReaction, SlackMessage } from '@/lib/database/entities/types'

// Plain object types for serialization
interface PlainSlackUser {
  id: string
  tenantId: string
  slackUserId: string
  realName?: string
  displayName?: string
  email?: string
  profileImage?: string
  title?: string
  isBot: boolean
  isAdmin: boolean
  isOwner: boolean
  timezone?: string
  userToken?: string
  scopes?: string[]
  tokenExpiresAt?: string // Date as ISO string
  isActive: boolean
  lastSeenAt?: string // Date as ISO string
  createdAt: string // Date as ISO string
  updatedAt: string // Date as ISO string
}

interface PlainConversationWithUser {
  id: string
  tenantId: string
  channelId: string
  channelName?: string
  content: string
  userId: string
  userName?: string
  reactions: SlackReaction[]
  threadReplies: SlackMessage[]
  threadTs?: string
  slackTimestamp: string // Date as ISO string
  createdAt: string // Date as ISO string
  updatedAt: string // Date as ISO string
  slackUser?: PlainSlackUser
}

// Helper function to convert SlackUser entity to plain object
function serializeSlackUser(user: SlackUser): PlainSlackUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    slackUserId: user.slackUserId,
    realName: user.realName,
    displayName: user.displayName,
    email: user.email,
    profileImage: user.profileImage,
    title: user.title,
    isBot: user.isBot,
    isAdmin: user.isAdmin,
    isOwner: user.isOwner,
    timezone: user.timezone,
    userToken: user.userToken,
    scopes: user.scopes,
    tokenExpiresAt: user.tokenExpiresAt?.toISOString(),
    isActive: user.isActive,
    lastSeenAt: user.lastSeenAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

// Helper function to convert Conversation entity to plain object
function serializeConversation(conversation: Conversation, slackUser?: SlackUser): PlainConversationWithUser {
  return {
    id: conversation.id,
    tenantId: conversation.tenantId,
    channelId: conversation.channelId,
    channelName: conversation.channelName,
    content: conversation.content,
    userId: conversation.userId,
    userName: conversation.userName,
    reactions: conversation.reactions,
    threadReplies: conversation.threadReplies,
    threadTs: conversation.threadTs,
    slackTimestamp: conversation.slackTimestamp.toISOString(),
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    slackUser: slackUser ? serializeSlackUser(slackUser) : undefined,
  }
}

async function getConversationsWithUsers(tenantId: string): Promise<PlainConversationWithUser[]> {
  try {
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)
    const slackUserRepository = dataSource.getRepository(SlackUser)
    
    const conversations = await conversationRepository.find({
      where: { tenantId },
      order: { slackTimestamp: 'DESC' },
      take: 50
    })

    // Enhance conversations with user information and serialize
    const enhancedConversations: PlainConversationWithUser[] = []
    
    for (const conversation of conversations) {
      const slackUser = await slackUserRepository.findOne({
        where: { 
          tenantId, 
          slackUserId: conversation.userId 
        }
      })
      
      enhancedConversations.push(serializeConversation(conversation, slackUser || undefined))
    }

    return enhancedConversations
  } catch (error) {
    console.error('Error fetching conversations with users:', error)
    return []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const conversations = await getConversationsWithUsers(tenantId)
    
    return NextResponse.json({ 
      conversations,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error in conversations API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
} 