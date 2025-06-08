'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, CheckCircle, AlertTriangle, MessageSquare, Hash, Lock } from 'lucide-react'

interface AuthorizedUser {
  id: string
  slackUserId: string
  realName?: string
  displayName?: string
  email?: string
  profileImage?: string
}

interface SlackChannel {
  id: string
  name: string
  isPrivate: boolean
  isMember: boolean
  isArchived: boolean
  topic?: string
  purpose?: string
  memberCount?: number
}

interface QuickMessageInterfaceProps {
  tenantId: string
  authorizedUsers: AuthorizedUser[]
}

export default function QuickMessageInterface({ tenantId, authorizedUsers }: QuickMessageInterfaceProps) {
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(false)
  const [message, setMessage] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Fetch joined channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setChannelsLoading(true)
        const response = await fetch(`/api/${tenantId}/slack/channels`)
        if (response.ok) {
          const data = await response.json()
          // Filter to only joined channels
          const joinedChannels = data.channels.filter((channel: SlackChannel) => channel.isMember)
          setChannels(joinedChannels)
        }
      } catch (error) {
        console.error('Failed to fetch channels:', error)
      } finally {
        setChannelsLoading(false)
      }
    }

    fetchChannels()
  }, [tenantId])

  const handleSendMessage = async () => {
    if (!selectedUser || !selectedChannel || !message.trim()) {
      setResult({ success: false, message: 'Please fill in all fields' })
      return
    }

    try {
      setSending(true)
      setResult(null)

      const response = await fetch(`/api/${tenantId}/slack/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post_message',
          channelId: selectedChannel,
          messageText: message,
          asUserId: selectedUser
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setResult({ 
          success: true, 
          message: `${data.message || 'Message sent successfully!'} It will appear in conversations shortly.`
        })
        setMessage('') // Clear message after successful send
      } else {
        setResult({ 
          success: false, 
          message: data.error || 'Failed to send message' 
        })
      }
    } catch (networkError) {
      console.error('Network error sending message:', networkError)
      setResult({ 
        success: false, 
        message: 'Network error occurred' 
      })
    } finally {
      setSending(false)
    }
  }

  if (authorizedUsers.length === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No authorized users available for messaging.</p>
            <p className="text-sm">
              <a href={`/${tenantId.split('-')[0]}/users`} className="text-blue-600 hover:text-blue-800">
                Authorize users
              </a> to enable messaging as them.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="h-5 w-5" />
          <span>Quick Message</span>
        </CardTitle>
        <CardDescription>
          Send a message to any channel as an authorized user
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Send as User</label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select authorized user" />
              </SelectTrigger>
              <SelectContent>
                {authorizedUsers.map((user) => (
                  <SelectItem key={user.slackUserId} value={user.slackUserId}>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                        {(user.displayName || user.realName || user.slackUserId).charAt(0).toUpperCase()}
                      </div>
                      <span>{user.displayName || user.realName || user.slackUserId}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Channel</label>
            <Select value={selectedChannel} onValueChange={setSelectedChannel} disabled={channelsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={channelsLoading ? "Loading channels..." : "Select channel"} />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    <div className="flex items-center space-x-2">
                      {channel.isPrivate ? (
                        <Lock className="w-4 h-4 text-orange-500" />
                      ) : (
                        <Hash className="w-4 h-4 text-blue-500" />
                      )}
                      <span>#{channel.name}</span>
                      {channel.memberCount && (
                        <span className="text-xs text-gray-500">({channel.memberCount})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Message</label>
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleSendMessage} 
          disabled={sending || !selectedUser || !selectedChannel || !message.trim()}
          className="w-full"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500">
          <p><strong>Tip:</strong> Only channels that your bot has joined are available for messaging. Visit the Channels page to join more channels.</p>
        </div>
      </CardContent>
    </Card>
  )
} 