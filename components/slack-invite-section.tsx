'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, ExternalLink, Info } from 'lucide-react'
import { OrganizationRole } from '@/lib/organization/types'

interface OrganizationMemberNotInSlack {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: OrganizationRole
}

interface SlackInviteSectionProps {
  tenantId: string
}

export default function SlackInviteSection({ tenantId }: SlackInviteSectionProps) {
  const [members, setMembers] = useState<OrganizationMemberNotInSlack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMembersNotInSlack = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/${tenantId}/organization/slack/members-not-in-slack`)
      
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      } else {
        setError('Failed to load members not in Slack')
      }
    } catch (fetchError) {
      setError('Error loading data')
      console.error('Error fetching members not in Slack:', fetchError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembersNotInSlack()
  }, [tenantId])

  const getRoleBadgeVariant = (role: OrganizationRole) => {
    switch (role) {
      case OrganizationRole.OWNER:
        return 'default'
      case OrganizationRole.ADMIN:
        return 'secondary'
      default:
        return 'outline'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Slack Workspace Invitations</span>
        </CardTitle>
        <CardDescription>
          Invite organization members to your Slack workspace if they are not already present
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All organization members are already in your Slack workspace, or Slack integration is not configured.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The following organization members are not in your Slack workspace. You can invite them manually through Slack.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                      {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={getRoleBadgeVariant(member.role)} className="capitalize">
                      {member.role}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Open Slack invite URL - this would need to be configured per workspace
                        window.open('https://slack.com/intl/en-gb/help/articles/201330256-Invite-new-members-to-your-workspace', '_blank')
                      }}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Invite to Slack
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Slack invitations must be sent manually through your Slack workspace settings. 
                Click the &quot;Invite to Slack&quot; button to open Slack&apos;s invitation guide.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 