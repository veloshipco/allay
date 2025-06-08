import { getTenantContext } from '@/lib/tenant'
import RealtimeConversations from '@/components/realtime-conversations'
import { Suspense } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import { initializeDatabase } from '@/lib/database/config'
import { Conversation } from '@/lib/database/entities/Conversation'
import { SlackUser } from '@/lib/database/entities/SlackUser'
import { SlackReaction, SlackMessage } from '@/lib/database/entities/types'
import { Not, IsNull } from 'typeorm'
import QuickMessageInterface from '@/components/quick-message-interface'

interface PageProps {
  params: Promise<{ tenantId: string }>
}

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

async function getInitialConversations(tenantId: string): Promise<PlainConversationWithUser[]> {
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
    console.error('Error fetching initial conversations:', error)
    return []
  }
}

function ConversationsLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading conversations...</span>
      </div>
    </div>
  )
}

export default async function ConversationsPage({ params }: PageProps) {
  const { tenantId } = await params
  const { tenant } = await getTenantContext(tenantId)

  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const isSlackConnected = tenant.slackConfig?.botToken && tenant.slackConfig?.teamId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
          <MessageSquare className="h-8 w-8" />
          <span>Conversations</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Monitor and interact with conversations from your Slack workspace in real-time.
        </p>
      </div>

      {isSlackConnected ? (
        <Suspense fallback={<ConversationsLoading />}>
          <ConversationsContent tenantId={tenantId} />
        </Suspense>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Slack Not Connected</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-4">
            Connect your Slack workspace to start viewing and managing conversations.
          </p>
          <a href={`/${tenantId}/integrations`} className="text-blue-600 hover:text-blue-800">
            Go to Integrations →
          </a>
        </div>
      )}
    </div>
  )
}

async function ConversationsContent({ tenantId }: { tenantId: string }) {
  const initialConversations = await getInitialConversations(tenantId)
  
  // Fetch authorized users for messaging
  const dataSource = await initializeDatabase()
  const slackUserRepository = dataSource.getRepository(SlackUser)
  const authorizedUsers = await slackUserRepository.find({
    where: { 
      tenantId,
      userToken: Not(IsNull()),
      isActive: true
    },
    select: {
      id: true,
      slackUserId: true,
      realName: true,
      displayName: true,
      email: true,
      profileImage: true
    }
  })
  
  const serializedAuthorizedUsers = authorizedUsers.map(user => ({
    id: user.id,
    slackUserId: user.slackUserId,
    realName: user.realName,
    displayName: user.displayName,
    email: user.email,
    profileImage: user.profileImage
  }))
  
  return (
    <div className="space-y-6">
      <QuickMessageInterface tenantId={tenantId} authorizedUsers={serializedAuthorizedUsers} />
      <RealtimeConversations 
        tenantId={tenantId} 
        initialConversations={initialConversations}
      />
    </div>
  )
} 