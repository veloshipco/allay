'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Users, Clock, ThumbsUp, Reply, Send, Plus } from 'lucide-react'
import { Conversation } from '@/lib/database/entities/Conversation'
import { SlackUser } from '@/lib/database/entities/SlackUser'
import { useState } from 'react'

interface EnhancedConversationListProps {
  conversations: ConversationWithUser[]
  tenantId: string
}

interface ConversationWithUser extends Conversation {
  slackUser?: SlackUser
}

function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return date.toLocaleDateString()
}

function ConversationReplyForm({ 
  conversationId, 
  channelId, 
  tenantId, 
  onReplySuccess 
}: {
  conversationId: string
  channelId: string
  tenantId: string
  onReplySuccess: () => void
}) {
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/${tenantId}/slack/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          channelId,
          messageText: replyText,
          threadTs: conversationId
        })
      })

      if (response.ok) {
        setReplyText('')
        onReplySuccess()
      } else {
        const error = await response.json()
        console.error('Failed to send reply:', error)
      }
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="Type your reply..."
        className="min-h-[80px] resize-none"
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={!replyText.trim() || isSubmitting}
          className="min-w-[80px]"
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Send className="h-3 w-3 mr-1" />
              Reply
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

function ConversationCard({ 
  conversation, 
  tenantId 
}: { 
  conversation: ConversationWithUser
  tenantId: string 
}) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const totalReactions = conversation.reactions.reduce((sum, reaction) => sum + reaction.count, 0)
  const threadCount = conversation.threadReplies.length

  const userDisplayName = conversation.slackUser?.realName || 
                         conversation.slackUser?.displayName || 
                         conversation.userName || 
                         'Unknown User'

  const userInitials = userDisplayName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleReplySuccess = () => {
    setShowReplyForm(false)
    // Could trigger a refresh here
  }

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
      
      <CardContent className="space-y-4">
        {/* User Information */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700">
            {userInitials}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">{userDisplayName}</div>
            {conversation.slackUser?.title && (
              <div className="text-xs text-gray-500">{conversation.slackUser.title}</div>
            )}
            {conversation.slackUser?.email && (
              <div className="text-xs text-gray-500">{conversation.slackUser.email}</div>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {conversation.slackUser?.isBot && (
              <Badge variant="secondary" className="text-xs">Bot</Badge>
            )}
            {conversation.slackUser?.isAdmin && (
              <Badge variant="outline" className="text-xs">Admin</Badge>
            )}
            {conversation.slackUser?.userToken && (
              <Badge variant="default" className="text-xs">Authorized</Badge>
            )}
          </div>
        </div>

        {/* Thread Replies Preview */}
        {threadCount > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">
              {threadCount} {threadCount === 1 ? 'Reply' : 'Replies'}
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {conversation.threadReplies.slice(-3).map((reply) => (
                <div key={reply.ts} className="text-sm p-2 bg-gray-50 rounded text-gray-600">
                  <span className="font-medium">@{reply.user}</span>: {reply.text}
                </div>
              ))}
              {threadCount > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  ... and {threadCount - 3} more replies
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2 border-t">
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-blue-600 hover:text-blue-800"
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              <Plus className="h-3 w-3 mr-1" />
              React
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            ID: {conversation.id.slice(-8)}
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="pt-3 border-t">
            <ConversationReplyForm
              conversationId={conversation.id}
              channelId={conversation.channelId}
              tenantId={tenantId}
              onReplySuccess={handleReplySuccess}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function EnhancedConversationList({ conversations, tenantId }: EnhancedConversationListProps) {
  if (conversations.length === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations Yet</h3>
          <p className="text-gray-500 max-w-sm mb-4">
            Once your Slack workspace starts receiving messages in channels where your bot is invited, conversations will appear here.
          </p>
          <Button variant="outline" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            Manage Channels
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Recent Conversations</h2>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">{conversations.length} conversations</Badge>
          <Badge variant="outline" className="text-green-600">
            {conversations.filter(c => c.slackUser).length} users tracked
          </Badge>
        </div>
      </div>
      
      <div className="grid gap-4">
        {conversations.map((conversation) => (
          <ConversationCard 
            key={conversation.id} 
            conversation={conversation} 
            tenantId={tenantId}
          />
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