'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, AlertTriangle } from 'lucide-react'

interface IntegrationsRealTimeWrapperProps {
  tenantId: string
  children: React.ReactNode
}

export default function IntegrationsRealTimeWrapper({ tenantId, children }: IntegrationsRealTimeWrapperProps) {
  const [appUninstalled, setAppUninstalled] = useState(false)
  const [userTokensRevoked, setUserTokensRevoked] = useState(false)

  useEffect(() => {
    // Connect to SSE stream for real-time updates
    const eventSource = new EventSource(`/api/${tenantId}/conversations/stream`)
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'app_uninstalled') {
          console.log('🚫 Received app uninstalled event')
          setAppUninstalled(true)
          
          // Auto-reload the page after 3 seconds to reflect the disconnected state
          setTimeout(() => {
            window.location.href = `/${tenantId}/integrations?disconnected=true&auto=true`
          }, 3000)
        }
        
        if (data.type === 'user_tokens_revoked') {
          console.log('🔒 Received user tokens revoked event')
          setUserTokensRevoked(true)
          
          // Clear the notification after 10 seconds
          setTimeout(() => setUserTokensRevoked(false), 10000)
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [tenantId])

  return (
    <div className="space-y-4">
      {/* Real-time app uninstall notification */}
      {appUninstalled && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Slack App Uninstalled:</strong> Your Slack workspace has been disconnected. 
            All data has been cleared and you&apos;ll be redirected to refresh the page automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time user tokens revoked notification */}
      {userTokensRevoked && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            <strong>User Authorizations Revoked:</strong> Some user posting authorizations have been revoked. 
            Users may need to re-authorize to post messages as themselves.
          </AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  )
} 