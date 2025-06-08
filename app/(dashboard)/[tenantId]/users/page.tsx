/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import { Suspense, useEffect, useState } from 'react'
import { SlackUser } from '@/lib/database/entities/SlackUser'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, CheckCircle, AlertTriangle, UserCheck, Shield, Key, Info } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import QuickMessageInterface from '@/components/quick-message-interface'

interface PageProps {
  params: Promise<{ tenantId: string }>
}

function UserAuthButton({ tenantId, user }: { tenantId: string; user: SlackUser }) {
  const handleAuth = async () => {
    try {
      const response = await fetch(`/api/${tenantId}/slack/user-auth?userId=${user.slackUserId}`)
      const data = await response.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        alert('Failed to generate authorization URL')
      }
    } catch (error) {
      console.error('Error initiating user auth:', error)
      alert('Failed to initiate authorization')
    }
  }

  const hasToken = !!user.userToken
  const displayName = user.displayName || user.realName || user.slackUserId

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium">{displayName}</div>
          {user.email && (
            <div className="text-sm text-gray-500">{user.email}</div>
          )}
          {user.title && (
            <div className="text-xs text-gray-400">{user.title}</div>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {user.isAdmin && (
          <Badge variant="secondary" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        )}
        {user.isOwner && (
          <Badge variant="secondary" className="text-xs">
            <UserCheck className="w-3 h-3 mr-1" />
            Owner
          </Badge>
        )}
        
        {hasToken ? (
          <Badge variant="default" className="text-xs bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Authorized
          </Badge>
        ) : (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              <Key className="w-3 h-3 mr-1" />
              Not Authorized
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handleAuth}
              className="text-xs"
            >
              Authorize
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusMessages() {
  const searchParams = useSearchParams()
  
  if (searchParams.get('user_auth_success')) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          User authorization completed successfully! You can now reply to messages as this user without &quot;via App&quot; attribution.
        </AlertDescription>
      </Alert>
    )
  }

  const error = searchParams.get('error')
  if (error) {
    let errorMessage = 'An error occurred during authorization.'
    
    switch (error) {
      case 'user_auth_access_denied':
        errorMessage = 'User authorization was cancelled. The user needs to approve the connection to post messages as them.'
        break
      case 'user_mismatch':
        errorMessage = 'Authorization failed: the authenticated user did not match the requested user.'
        break
      case 'user_oauth_failed':
        errorMessage = 'User authorization failed. Please try again.'
        break
      case 'missing_code':
        errorMessage = 'Authorization was incomplete. Please try the authorization process again.'
        break
    }

    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    )
  }

  return null
}

function UsersContent({ tenantId, onUsersUpdate }: { tenantId: string; onUsersUpdate: (users: SlackUser[]) => void }) {
  const [users, setUsers] = useState<SlackUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/${tenantId}/slack/users?t=${Date.now()}`) // Cache busting
      if (response.ok) {
        const data = await response.json()
        const usersList = data.users || []
        setUsers(usersList)
        onUsersUpdate(usersList) // Update parent component with latest users
      } else {
        setError('Failed to fetch users')
      }
    } catch (fetchError) {
      setError('Error loading users')
      console.error('Error fetching users:', fetchError)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [tenantId])

  // Refresh when returning from authorization
  useEffect(() => {
    if (searchParams.get('user_auth_success') || searchParams.get('refresh')) {
      fetchUsers()
    }
  }, [searchParams])

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
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-32" />
                      </div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }
  
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Found</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-4">
            Users will appear here once they start interacting with your Slack workspace integration.
          </p>
          <Link href={`/${tenantId}/conversations`}>
            <Button variant="outline">View Conversations</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  const unauthorizedUsers = users.filter(u => !u.userToken)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">{users.length}</CardTitle>
            <CardDescription>Total Users</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-green-600">{users.filter(u => u.userToken).length}</CardTitle>
            <CardDescription>Authorized</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-orange-600">{unauthorizedUsers.length}</CardTitle>
            <CardDescription>Needs Authorization</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slack Users</CardTitle>
              <CardDescription>
                Manage user authorizations for posting messages without &quot;via App&quot; attribution
              </CardDescription>
            </div>
            <Button 
              onClick={fetchUsers} 
              disabled={loading}
              variant="outline" 
              size="sm"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="p-4 border rounded-lg">
                <UserAuthButton tenantId={tenantId} user={user} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UsersPage({ params }: PageProps) {
  const [tenantId, setTenantId] = useState<string>('')
  const [tenantExists, setTenantExists] = useState<boolean | null>(null)
  const [isSlackConnected, setIsSlackConnected] = useState<boolean>(false)
  const [authorizedUsers, setAuthorizedUsers] = useState<SlackUser[]>([])

  useEffect(() => {
    const initializePage = async () => {
      const resolvedParams = await params
      setTenantId(resolvedParams.tenantId)
      
      // Check tenant status
      try {
        const response = await fetch(`/api/tenants/${resolvedParams.tenantId}/info`)
        if (response.ok) {
          const data = await response.json()
          setTenantExists(true)
          setIsSlackConnected(data.isSlackConnected)
          
          // Fetch authorized users for messaging interface
          if (data.isSlackConnected) {
            const usersResponse = await fetch(`/api/${resolvedParams.tenantId}/slack/users`)
            if (usersResponse.ok) {
              const usersData = await usersResponse.json()
              const authorized = (usersData.users || []).filter((u: SlackUser) => u.userToken)
              setAuthorizedUsers(authorized)
            }
          }
        } else {
          setTenantExists(false)
        }
      } catch (initError) {
        console.error('Error checking tenant:', initError)
        setTenantExists(false)
      }
    }

    initializePage()
  }, [params])

  // Update authorized users when users data changes
  const handleUsersUpdate = (users: SlackUser[]) => {
    const authorized = users.filter(u => u.userToken)
    setAuthorizedUsers(authorized)
  }

  if (tenantExists === null) {
    return <div>Loading...</div>
  }

  if (tenantExists === false) {
    return <div>Tenant not found</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
          <Users className="h-8 w-8" />
          <span>Users</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Manage user authorizations for posting messages as specific users without &quot;via App&quot; attribution.
        </p>
      </div>

      {/* Status Messages */}
      <Suspense fallback={null}>
        <StatusMessages />
      </Suspense>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          <strong>User Authorization:</strong> When users authorize the app, their replies will appear as genuine user messages without any &quot;via App&quot; attribution. Users who haven&apos;t authorized will still have their replies posted, but with bot attribution and their profile information.
        </AlertDescription>
      </Alert>

      {isSlackConnected ? (
        <>
          <UsersContent tenantId={tenantId} onUsersUpdate={handleUsersUpdate} />
          <QuickMessageInterface tenantId={tenantId} authorizedUsers={authorizedUsers} />
        </>
      ) : (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Slack Not Connected</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-4">
            Connect your Slack workspace first to start managing user authorizations.
          </p>
          <Link href={`/${tenantId}/integrations`}>
            <Button>Connect Slack</Button>
          </Link>
        </div>
      )}
    </div>
  )
} 