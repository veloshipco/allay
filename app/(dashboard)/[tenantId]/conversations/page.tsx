import { getTenantContext } from '@/lib/tenant'
import EnhancedConversationList from '@/components/enhanced-conversation-list'
import { Suspense } from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import { initializeDatabase } from '@/lib/database/config'
import { Conversation } from '@/lib/database/entities/Conversation'
import { SlackUser } from '@/lib/database/entities/SlackUser'

interface PageProps {
  params: Promise<{ tenantId: string }>
}

interface ConversationWithUser extends Conversation {
  slackUser?: SlackUser
}

async function getConversationsWithUsers(tenantId: string): Promise<ConversationWithUser[]> {
  try {
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)
    const slackUserRepository = dataSource.getRepository(SlackUser)
    
    const conversations = await conversationRepository.find({
      where: { tenantId },
      order: { slackTimestamp: 'DESC' },
      take: 50
    })

    // Enhance conversations with user information
    const enhancedConversations: ConversationWithUser[] = []
    
    for (const conversation of conversations) {
      const slackUser = await slackUserRepository.findOne({
        where: { 
          tenantId, 
          slackUserId: conversation.userId 
        }
      })
      
      enhancedConversations.push({
        ...conversation,
        slackUser: slackUser || undefined
      })
    }

    return enhancedConversations
  } catch (error) {
    console.error('Error fetching conversations with users:', error)
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
  const conversations = await getConversationsWithUsers(tenantId)
  return <EnhancedConversationList conversations={conversations} tenantId={tenantId} />
} 