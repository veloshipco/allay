import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getTenantContext } from '@/lib/tenant'
import { SlackConnectButton } from '@/components/slack-connect-button'

export default async function IntegrationsPage({
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
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect external services to sync your conversations
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-slack rounded flex items-center justify-center">
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-5 h-5 fill-white"
                >
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.521-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.523 2.521h-2.521V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.521A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.523v-2.521h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                </svg>
              </div>
              <span>Slack Integration</span>
            </CardTitle>
            <CardDescription>
              Connect your Slack workspace to sync conversations and enable real-time monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSlackConnected ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-green-800">Connected</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Team: {tenant.slackConfig?.teamName || tenant.slackConfig?.teamId}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Integration Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Team ID:</span>
                      <p className="font-mono">{tenant.slackConfig?.teamId}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bot Token:</span>
                      <p className="font-mono">
                        {tenant.slackConfig?.botToken 
                          ? `${tenant.slackConfig.botToken.substring(0, 10)}...` 
                          : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Available Actions</h4>
                  <div className="flex space-x-2">
                    <SlackConnectButton tenantId={params.tenantId} isReconnect />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                    <span className="font-medium text-amber-800">Not Connected</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    Connect your Slack workspace to start syncing conversations
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">What you&apos;ll get:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Real-time conversation syncing</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Message reactions and thread replies</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Channel and user metadata</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      <span>Secure webhook notifications</span>
                    </li>
                  </ul>
                </div>

                <SlackConnectButton tenantId={params.tenantId} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              More integrations will be available in future updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-dashed rounded-lg opacity-50">
                <h4 className="font-medium mb-2">Microsoft Teams</h4>
                <p className="text-sm text-muted-foreground">
                  Sync conversations from Microsoft Teams
                </p>
              </div>
              <div className="p-4 border border-dashed rounded-lg opacity-50">
                <h4 className="font-medium mb-2">Discord</h4>
                <p className="text-sm text-muted-foreground">
                  Connect your Discord server
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 