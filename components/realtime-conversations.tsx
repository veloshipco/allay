'use client'

import { useConversations, ConversationWithUser } from '@/lib/hooks/useConversations'
import EnhancedConversationList from './enhanced-conversation-list'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Wifi, WifiOff, Clock, Activity } from 'lucide-react'
import { useState } from 'react'

interface RealtimeConversationsProps {
  tenantId: string
  initialConversations?: ConversationWithUser[]
}

function formatLastUpdated(lastUpdated: string | null): string {
  if (!lastUpdated) return 'Never'
  
  const date = new Date(lastUpdated)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffSecs < 5) return 'just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffMins < 60) return `${diffMins}m ago`
  
  return date.toLocaleTimeString()
}

export default function RealtimeConversations({ 
  tenantId, 
  initialConversations = [] 
}: RealtimeConversationsProps) {
  const [pollingEnabled, setPollingEnabled] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  const { 
    conversations, 
    loading, 
    error, 
    lastUpdated, 
    refetch,
    isPolling 
  } = useConversations(tenantId, {
    polling: pollingEnabled,
    pollingInterval: 3000, // 3 seconds for real-time feel
    initialData: initialConversations
  })

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const togglePolling = () => {
    setPollingEnabled(!pollingEnabled)
  }

  return (
    <div className="space-y-4">
      {/* Enhanced Status Bar */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {pollingEnabled ? (
                <div className="flex items-center space-x-1">
                  <Wifi className="h-4 w-4 text-green-500" />
                  {isPolling && <Activity className="h-3 w-3 text-blue-500 animate-pulse" />}
                </div>
              ) : (
                <WifiOff className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm font-medium">
                {pollingEnabled ? 'Live Updates (3s)' : 'Manual Mode'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePolling}
                className="text-xs"
              >
                {pollingEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
              {isPolling && (
                <span className="text-blue-500 text-xs">• Checking for updates...</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {conversations.length} conversations
            </Badge>
            <Badge variant={pollingEnabled ? "default" : "outline"} className="text-xs">
              {pollingEnabled ? "Real-time" : "Static"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to fetch conversations: {error}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleManualRefresh}
              className="ml-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time Status Indicator */}
      {pollingEnabled && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 text-sm text-green-700">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>
              Connected to Slack workspace - New messages will appear automatically every 3 seconds
            </span>
          </div>
        </div>
      )}

      {/* Loading State for Initial Load */}
      {loading && conversations.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading conversations...</span>
          </div>
        </div>
      )}

      {/* Conversations List */}
      <EnhancedConversationList 
        conversations={conversations} 
        tenantId={tenantId}
        onRefreshNeeded={refetch}
      />
    </div>
  )
} 