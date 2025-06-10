'use client'

import { Suspense, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users, UserPlus, Mail, Shield, Crown, User, CheckCircle, Clock, XCircle } from 'lucide-react'
import { OrganizationMemberInfo, InvitationInfo, OrganizationRole, InvitationStatus } from '@/lib/organization/types'
import InviteMemberDialog from '@/components/invite-member-dialog'
import SlackInviteSection from '@/components/slack-invite-section'

interface PageProps {
  params: Promise<{ tenantId: string }>
}

function getRoleIcon(role: OrganizationRole) {
  switch (role) {
    case OrganizationRole.OWNER:
      return <Crown className="w-4 h-4" />
    case OrganizationRole.ADMIN:
      return <Shield className="w-4 h-4" />
    default:
      return <User className="w-4 h-4" />
  }
}

function getRoleBadgeVariant(role: OrganizationRole) {
  switch (role) {
    case OrganizationRole.OWNER:
      return 'default'
    case OrganizationRole.ADMIN:
      return 'secondary'
    default:
      return 'outline'
  }
}

function getStatusIcon(status: InvitationStatus) {
  switch (status) {
    case InvitationStatus.PENDING:
      return <Clock className="w-4 h-4 text-yellow-500" />
    case InvitationStatus.ACCEPTED:
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case InvitationStatus.DECLINED:
      return <XCircle className="w-4 h-4 text-red-500" />
    case InvitationStatus.EXPIRED:
      return <XCircle className="w-4 h-4 text-gray-500" />
    case InvitationStatus.CANCELLED:
      return <XCircle className="w-4 h-4 text-gray-500" />
    default:
      return <Clock className="w-4 h-4 text-gray-500" />
  }
}

function OrganizationContent({ tenantId }: { tenantId: string }) {
  const [members, setMembers] = useState<OrganizationMemberInfo[]>([])
  const [invitations, setInvitations] = useState<InvitationInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch members and invitations in parallel
      const [membersResponse, invitationsResponse] = await Promise.all([
        fetch(`/api/${tenantId}/organization/members`),
        fetch(`/api/${tenantId}/organization/invitations`)
      ])

      if (membersResponse.ok) {
        const membersData = await membersResponse.json()
        setMembers(membersData.members || [])
      }

      if (invitationsResponse.ok) {
        const invitationsData = await invitationsResponse.json()
        setInvitations(invitationsData.invitations || [])
      }
    } catch (fetchError) {
      setError('Failed to load organization data')
      console.error('Error fetching organization data:', fetchError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [tenantId])

  const handleInviteSuccess = () => {
    setShowInviteDialog(false)
    fetchData() // Refresh data
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const activeMembers = members.filter(m => m.isActive)
  const pendingInvitations = invitations.filter(i => i.status === InvitationStatus.PENDING)

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active organization members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvitations.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeMembers.filter(m => m.role === OrganizationRole.ADMIN || m.role === OrganizationRole.OWNER).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Owners and admins
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="members" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="slack">Slack Integration</TabsTrigger>
          </TabsList>
          
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>
                Manage your organization members and their roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                        {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                        <div className="text-xs text-gray-400">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center space-x-1">
                        {getRoleIcon(member.role)}
                        <span className="capitalize">{member.role}</span>
                      </Badge>
                    </div>
                  </div>
                ))}
                
                {activeMembers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No members found. Invite some members to get started!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Invitations</CardTitle>
              <CardDescription>
                Track and manage organization invitations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="font-medium">{invitation.email}</div>
                        <div className="text-sm text-gray-500">
                          Invited by {invitation.invitedByName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(invitation.createdAt).toLocaleDateString()} • 
                          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoleBadgeVariant(invitation.proposedRole)} className="flex items-center space-x-1">
                        {getRoleIcon(invitation.proposedRole)}
                        <span className="capitalize">{invitation.proposedRole}</span>
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(invitation.status)}
                        <span className="text-sm capitalize">{invitation.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {invitations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No invitations found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="slack" className="space-y-4">
          <SlackInviteSection tenantId={tenantId} />
        </TabsContent>
      </Tabs>

      <InviteMemberDialog
        tenantId={tenantId}
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onSuccess={handleInviteSuccess}
      />
    </div>
  )
}

export default function OrganizationPage({ params }: PageProps) {
  const [tenantId, setTenantId] = useState<string>('')

  useEffect(() => {
    const initializePage = async () => {
      const resolvedParams = await params
      setTenantId(resolvedParams.tenantId)
    }
    initializePage()
  }, [params])

  if (!tenantId) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Organization Management</h1>
        <p className="text-gray-600">Manage your organization members, roles, and permissions</p>
      </div>
      
      <Suspense fallback={<div>Loading organization data...</div>}>
        <OrganizationContent tenantId={tenantId} />
      </Suspense>
    </div>
  )
} 