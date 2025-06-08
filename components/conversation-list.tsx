import { initializeDatabase } from '@/lib/database/config'
import { Conversation } from '@/lib/database/entities/Conversation'
import { Card, CardContent } from '@/components/ui/card'

export async function ConversationList({ tenantId }: { tenantId: string }) {
  try {
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)
    
    const conversations = await conversationRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 10
    })

    if (conversations.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No conversations found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Connect your Slack workspace to start syncing conversations
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {conversations.map((conversation) => (
          <ConversationCard 
            key={conversation.id}
            conversation={conversation}
          />
        ))}
      </div>
    )
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Error loading conversations</p>
      </div>
    )
  }
}

function ConversationCard({ conversation }: { conversation: Conversation }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                #{conversation.channelName || conversation.channelId}
              </span>
              <span className="text-xs text-muted-foreground">
                by {conversation.userName || conversation.userId}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {conversation.content}
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(conversation.slackTimestamp).toLocaleDateString()}
          </div>
        </div>
        
        {conversation.reactions.length > 0 && (
          <div className="flex items-center space-x-2 mt-3">
            {conversation.reactions.slice(0, 3).map((reaction, index) => (
              <div 
                key={index}
                className="flex items-center space-x-1 text-xs bg-muted px-2 py-1 rounded"
              >
                <span>{reaction.name}</span>
                <span>{reaction.count}</span>
              </div>
            ))}
          </div>
        )}

        {conversation.threadReplies.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {conversation.threadReplies.length} replies
          </div>
        )}
      </CardContent>
    </Card>
  )
} 