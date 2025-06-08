import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getTenantContext } from '@/lib/tenant'
import ConversationList from '@/components/conversation-list'
import { MessageSquare, Settings, Activity, Clock } from 'lucide-react'
import Link from 'next/link'

async function getConversationStats(tenantId: string) {
  try {
    const { initializeDatabase } = await import('@/lib/database/config')
    const { Conversation } = await import('@/lib/database/entities/Conversation')
    
    const dataSource = await initializeDatabase()
    const conversationRepository = dataSource.getRepository(Conversation)
    
    const totalConversations = await conversationRepository.count({
      where: { tenantId }
    })
    
    const activeChannels = await conversationRepository
      .createQueryBuilder('conversation')
      .select('DISTINCT conversation.channelId')
      .where('conversation.tenantId = :tenantId', { tenantId })
      .getCount()
    
    const lastSync = await conversationRepository.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' }
    })
    
    return {
      totalConversations,
      activeChannels,
      lastSync: lastSync?.createdAt || null
    }
  } catch (error) {
    console.error('Error fetching conversation stats:', error)
    return {
      totalConversations: 0,
      activeChannels: 0,
      lastSync: null
    }
  }
}

export default async function TenantDashboard({
  params
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const { tenant } = await getTenantContext(tenantId)
  
  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const isSlackConnected = !!tenant.slackConfig?.botToken
  const stats = await getConversationStats(tenantId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to {tenant.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href={`/${tenantId}/integrations`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Slack Integration
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">
                {isSlackConnected ? 'Connected' : 'Disconnected'}
              </div>
              <Badge variant={isSlackConnected ? 'default' : 'secondary'}>
                {isSlackConnected ? 'Active' : 'Setup Required'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isSlackConnected 
                ? `Team: ${tenant.slackConfig?.teamName || tenant.slackConfig?.teamId}` 
                : 'Connect your Slack workspace'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              Synced from Slack
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Channels
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChannels}</div>
            <p className="text-xs text-muted-foreground">
              Being monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Last Sync
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastSync ? 'Recent' : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lastSync 
                ? stats.lastSync.toLocaleDateString()
                : 'No data synchronized yet'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ConversationList tenantId={tenantId} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Manage your integration settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSlackConnected ? (
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 text-blue-900">Connect Slack</h4>
                  <p className="text-sm text-blue-700 mb-4">
                    Connect your Slack workspace to start syncing conversations and receiving real-time events.
                  </p>
                  <Link href={`/${tenantId}/integrations`}>
                    <Button size="sm" className="w-full">
                      Set up integration
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <h4 className="font-medium mb-2 text-green-900">Slack Connected</h4>
                  <p className="text-sm text-green-700 mb-4">
                    Your Slack workspace is connected and syncing conversations.
                  </p>
                  <Link href={`/${tenantId}/integrations`}>
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Settings
                    </Button>
                  </Link>
                </div>
              )}
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Analytics</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  View detailed analytics and insights about your conversations.
                </p>
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>

          {isSlackConnected && stats.totalConversations > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest events from your workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Slack Connected</p>
                      <p className="text-xs text-muted-foreground">
                        Team: {tenant.slackConfig?.teamName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Conversations Synced</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.totalConversations} messages processed
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 