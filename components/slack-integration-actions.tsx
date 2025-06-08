'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Settings, Users, MessageSquare, Hash, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import SlackDisconnectDialog from './slack-disconnect-dialog'

interface SlackIntegrationActionsProps {
  tenantId: string
  teamName?: string
}

export default function SlackIntegrationActions({ 
  tenantId, 
  teamName 
}: SlackIntegrationActionsProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Link href={`/${tenantId}/conversations`}>
          <Button variant="default" size="sm">
            <MessageSquare className="h-4 w-4 mr-2" />
            View Conversations
          </Button>
        </Link>
        <Link href={`/${tenantId}/channels`}>
          <Button variant="outline" size="sm">
            <Hash className="h-4 w-4 mr-2" />
            Manage Channels
          </Button>
        </Link>
        <Link href={`/${tenantId}/users`}>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            View Users
          </Button>
        </Link>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button 
          variant="destructive" 
          size="sm"
          onClick={() => setShowDisconnectDialog(true)}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Uninstall
        </Button>
      </div>

      <SlackDisconnectDialog
        tenantId={tenantId}
        teamName={teamName}
        isOpen={showDisconnectDialog}
        onOpenChange={setShowDisconnectDialog}
      />
    </>
  )
} 