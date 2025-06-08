'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Hash, Users, Lock, Plus, Search, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { SlackChannel } from '@/lib/database/entities/types'

interface ChannelManagementProps {
  tenantId: string
}

interface ChannelListResponse {
  channels: SlackChannel[]
  total: number
  joinedChannels: number
}

export default function ChannelManagement({ tenantId }: ChannelManagementProps) {
  const [channels, setChannels] = useState<SlackChannel[]>([])
  const [stats, setStats] = useState({ total: 0, joinedChannels: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [joiningChannels, setJoiningChannels] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchChannels()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchChannels = async () => {
    try {
      setLoading(true)
      setError('')

      const response = await fetch(`/api/${tenantId}/slack/channels`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch channels')
      }

      const data: ChannelListResponse = await response.json()
      setChannels(data.channels)
      setStats({
        total: data.total,
        joinedChannels: data.joinedChannels
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch channels')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinChannel = async (channelId: string) => {
    try {
      setJoiningChannels(prev => new Set(prev).add(channelId))
      setError('')
      setSuccess('')

      const response = await fetch(`/api/${tenantId}/slack/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          channelId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        // Refresh channels list to update membership status
        await fetchChannels()
      } else {
        setError(data.error || 'Failed to join channel')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join channel')
    } finally {
      setJoiningChannels(prev => {
        const newSet = new Set(prev)
        newSet.delete(channelId)
        return newSet
      })
    }
  }

  const filteredChannels = channels.filter(channel =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.purpose?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const joinedChannels = filteredChannels.filter(c => c.isMember)
  const unjoinedChannels = filteredChannels.filter(c => !c.isMember && !c.isArchived)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading channels...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Channel Management</h2>
          <p className="text-gray-600">
            Manage your Slack channel subscriptions and monitor conversations
          </p>
        </div>
        <Button onClick={fetchChannels} disabled={loading}>
          <Search className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Hash className="h-5 w-5 text-blue-500" />
              <div>
                <div className="font-semibold text-lg">{stats.total}</div>
                <div className="text-sm text-gray-500">Total Channels</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="font-semibold text-lg">{stats.joinedChannels}</div>
                <div className="text-sm text-gray-500">Joined Channels</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <div className="font-semibold text-lg">{stats.total - stats.joinedChannels}</div>
                <div className="text-sm text-gray-500">Available to Join</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search">Search Channels</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="search"
            type="text"
            placeholder="Search by name, topic, or purpose..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Channels Tabs */}
      <Tabs defaultValue="joined" className="space-y-4">
        <TabsList>
          <TabsTrigger value="joined">
            Joined ({joinedChannels.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available ({unjoinedChannels.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="joined" className="space-y-4">
          {joinedChannels.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Hash className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Joined Channels</h3>
                <p className="text-gray-500 max-w-sm">
                  Join channels to start receiving and managing conversations from your Slack workspace.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {joinedChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isJoined={true}
                  onJoin={() => handleJoinChannel(channel.id)}
                  isJoining={joiningChannels.has(channel.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          {unjoinedChannels.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">All Available Channels Joined</h3>
                <p className="text-gray-500 max-w-sm">
                  You&apos;ve joined all available channels that match your search criteria.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {unjoinedChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  isJoined={false}
                  onJoin={() => handleJoinChannel(channel.id)}
                  isJoining={joiningChannels.has(channel.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ChannelCard({
  channel,
  isJoined,
  onJoin,
  isJoining
}: {
  channel: SlackChannel
  isJoined: boolean
  onJoin: () => void
  isJoining: boolean
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-2">
              {channel.isPrivate ? (
                <Lock className="h-4 w-4 text-orange-500" />
              ) : (
                <Hash className="h-4 w-4 text-blue-500" />
              )}
              <span>#{channel.name}</span>
              {isJoined && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Joined
                </Badge>
              )}
              {channel.isPrivate && (
                <Badge variant="outline" className="text-orange-600">
                  Private
                </Badge>
              )}
            </CardTitle>
            {(channel.topic || channel.purpose) && (
              <CardDescription className="mt-2">
                {channel.topic || channel.purpose}
              </CardDescription>
            )}
          </div>
          {!isJoined && (
            <Button
              onClick={onJoin}
              disabled={isJoining}
              size="sm"
              className="min-w-[80px]"
            >
              {isJoining ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Join
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      {channel.memberCount && (
        <CardContent className="pt-0">
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Users className="h-3 w-3" />
            <span>{channel.memberCount} members</span>
          </div>
        </CardContent>
      )}
    </Card>
  )
} 