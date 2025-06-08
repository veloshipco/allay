import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getTenantContext } from '@/lib/tenant'
import { ConversationList } from '@/components/conversation-list'

export default async function TenantDashboard({
  params
}: {
  params: { tenantId: string }
}) {
  const { tenant } = await getTenantContext(params.tenantId)
  
  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const isSlackConnected = !!tenant.slackConfig?.botToken

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to {tenant.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Slack Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSlackConnected ? 'Connected' : 'Not Connected'}
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
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
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
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
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
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Never</div>
            <p className="text-xs text-muted-foreground">
              Data synchronization
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>
              Latest conversations from your Slack workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConversationList tenantId={params.tenantId} />
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Manage your integration settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSlackConnected && (
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Connect Slack</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Slack workspace to start syncing conversations.
                </p>
                <a 
                  href={`/${params.tenantId}/integrations`}
                  className="text-sm text-primary hover:underline"
                >
                  Set up integration →
                </a>
              </div>
            )}
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">View Conversations</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Browse and search through your synced conversations.
              </p>
              <a 
                href={`/${params.tenantId}/conversations`}
                className="text-sm text-primary hover:underline"
              >
                View all conversations →
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 