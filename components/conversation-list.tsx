import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MessageSquare, Users, Clock, ThumbsUp } from 'lucide-react'
import { initializeDatabase } from '@/lib/database/config'
import { Conversation } from '@/lib/database/entities/Conversation'

interface ConversationListProps {
  tenantId: string
}

async function getConversations(tenantId: string) {
  try {
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)
    
    const conversations = await conversationRepository.find({
      where: { tenantId },
      order: { slackTimestamp: 'DESC' },
      take: 50 // Limit to recent 50 conversations
    })

    return conversations
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return []
  }
}

function formatTimestamp(timestamp: Date) {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return timestamp.toLocaleDateString()
}

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const totalReactions = conversation.reactions.reduce((sum, reaction) => sum + reaction.count, 0)
  const threadCount = conversation.threadReplies.length

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base font-medium line-clamp-2">
              {conversation.content || 'No content'}
            </CardTitle>
            <CardDescription className="flex items-center space-x-4 mt-2">
              <span className="flex items-center space-x-1">
                <MessageSquare className="h-3 w-3" />
                <span>#{conversation.channelName || conversation.channelId}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{formatTimestamp(conversation.slackTimestamp)}</span>
              </span>
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {totalReactions > 0 && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <ThumbsUp className="h-3 w-3" />
                <span>{totalReactions}</span>
              </Badge>
            )}
            {threadCount > 0 && (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{threadCount}</span>
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      {(conversation.reactions.length > 0 || threadCount > 0) && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {conversation.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {conversation.reactions.map((reaction, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    :{reaction.name}: {reaction.count}
                  </Badge>
                ))}
              </div>
            )}
            {threadCount > 0 && (
              <p className="text-xs text-gray-500">
                {threadCount} {threadCount === 1 ? 'reply' : 'replies'} in thread
              </p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default async function ConversationList({ tenantId }: ConversationListProps) {
  const conversations = await getConversations(tenantId)

  if (conversations.length === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations Yet</h3>
          <p className="text-gray-500 max-w-sm mb-4">
            Once you connect your Slack workspace, conversations will appear here automatically.
          </p>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            View Integrations
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Recent Conversations</h2>
        <Badge variant="secondary">{conversations.length} conversations</Badge>
      </div>
      
      <div className="grid gap-4">
        {conversations.map((conversation) => (
          <ConversationCard key={conversation.id} conversation={conversation} />
        ))}
      </div>
      
      {conversations.length >= 50 && (
        <div className="text-center">
          <Button variant="outline">Load More Conversations</Button>
        </div>
      )}
    </div>
  )
} 