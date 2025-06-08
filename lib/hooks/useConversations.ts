import { useState, useEffect, useCallback, useRef } from 'react'
import { SlackReaction, SlackMessage } from '@/lib/database/entities/types'

// Plain object types for client components
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

export interface ConversationWithUser {
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

interface ConversationsResponse {
  conversations: ConversationWithUser[]
  lastUpdated: string
}

interface UseConversationsReturn {
  conversations: ConversationWithUser[]
  loading: boolean
  error: string | null
  lastUpdated: string | null
  refetch: () => Promise<void>
  isPolling: boolean
}

export function useConversations(
  tenantId: string,
  options: {
    polling?: boolean
    pollingInterval?: number
    initialData?: ConversationWithUser[]
  } = {}
): UseConversationsReturn {
  const {
    polling = true,
    pollingInterval = 3000, // 3 seconds for more real-time feel
    initialData = []
  } = options

  const [conversations, setConversations] = useState<ConversationWithUser[]>(initialData)
  const [loading, setLoading] = useState(initialData.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  
  // Track polling state to prevent multiple concurrent requests
  const pollingRef = useRef<boolean>(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchConversations = useCallback(async (isManual = false) => {
    // Prevent concurrent polling requests
    if (pollingRef.current && !isManual) {
      return
    }

    try {
      pollingRef.current = true
      setIsPolling(true)
      setError(null)

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      const response = await fetch(`/api/${tenantId}/conversations`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`)
      }

      const data: ConversationsResponse = await response.json()
      
      // Only update if data has changed (simple check by count and last timestamp)
      const hasChanged = 
        conversations.length !== data.conversations.length ||
        (data.conversations.length > 0 && conversations.length > 0 && 
         data.conversations[0].slackTimestamp !== conversations[0]?.slackTimestamp)

      if (hasChanged || isManual) {
        setConversations(data.conversations)
      }
      
      setLastUpdated(data.lastUpdated)
    } catch (err) {
      // Don't set error for aborted requests
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
        console.error('Error fetching conversations:', err)
      }
    } finally {
      setLoading(false)
      setIsPolling(false)
      pollingRef.current = false
    }
  }, [tenantId, conversations])

  // Initial fetch
  useEffect(() => {
    if (initialData.length === 0) {
      fetchConversations(true)
    } else {
      setLastUpdated(new Date().toISOString())
    }
  }, [fetchConversations, initialData.length])

  // Polling effect with better cleanup
  useEffect(() => {
    if (!polling) return

    const interval = setInterval(() => {
      fetchConversations(false)
    }, pollingInterval)

    return () => {
      clearInterval(interval)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [polling, pollingInterval, fetchConversations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    conversations,
    loading,
    error,
    lastUpdated,
    refetch: () => fetchConversations(true),
    isPolling
  }
} 