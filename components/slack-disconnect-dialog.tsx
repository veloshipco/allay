'use client'

import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertTriangle } from 'lucide-react'

interface SlackDisconnectDialogProps {
  tenantId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  teamName?: string
}

export default function SlackDisconnectDialog({
  tenantId,
  isOpen,
  onOpenChange,
  teamName
}: SlackDisconnectDialogProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [error, setError] = useState('')

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      setError('')

      const response = await fetch(`/api/${tenantId}/slack/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmDisconnect: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        onOpenChange(false)
        
        // Cache-busting redirect to ensure UI updates
        const timestamp = new Date().getTime()
        const redirectUrl = `/${tenantId}/integrations?disconnected=true&t=${timestamp}`
        
        // Force complete page reload to bypass caching
        window.location.replace(redirectUrl)
      } else {
        setError(data.error || 'Failed to disconnect')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect')
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Uninstall Slack Integration</span>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to completely uninstall the app from your Slack workspace
              {teamName && (
                <span className="font-medium"> &quot;{teamName}&quot;</span>
              )}?
            </p>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>This will:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Remove the app from your Slack workspace</li>
                <li>Stop all event processing</li>
                <li>Delete all stored conversations and messages</li>
                <li>Remove all user profile data</li>
                <li>Reset your tenant to pre-integration state</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Warning Notice */}
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium">This action cannot be undone!</p>
                <p>All conversation data will be permanently deleted. You can reconnect later, but historical data will be lost.</p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisconnecting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDisconnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uninstalling...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Uninstall Completely
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 