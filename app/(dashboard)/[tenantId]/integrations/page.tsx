/* eslint-disable @next/next/no-img-element */
import { getTenantContext } from '@/lib/tenant'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slack, CheckCircle, Settings, AlertTriangle, Info, Users, MessageSquare, Hash } from 'lucide-react'
import { Suspense } from 'react'
import SlackIntegrationActions from '@/components/slack-integration-actions'

interface PageProps {
  params: Promise<{ tenantId: string }>
  searchParams: Promise<{ success?: string; error?: string; disconnected?: string }>
}

function IntegrationMessages({ searchParams }: { searchParams: { success?: string; error?: string; disconnected?: string } }) {
  if (searchParams.success === 'true') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Slack integration connected successfully! You can now start receiving events from your Slack workspace and manage conversations.
        </AlertDescription>
      </Alert>
    )
  }

  if (searchParams.disconnected === 'true') {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700">
          Slack integration has been completely uninstalled from your workspace. All data has been cleared and your tenant has been reset. You can reconnect at any time using the button below.
        </AlertDescription>
      </Alert>
    )
  }

  if (searchParams.error) {
    let errorMessage = 'Failed to connect Slack integration. Please try again.'
    
    switch (searchParams.error) {
      case 'access_denied':
        errorMessage = 'Slack integration was cancelled. You need to approve the connection to continue.'
        break
      case 'oauth_failed':
        errorMessage = 'Failed to complete Slack authorization. Please try connecting again.'
        break
      default:
        errorMessage = `Connection failed: ${searchParams.error}. Please try again.`
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

export default async function IntegrationsPage({ params, searchParams }: PageProps) {
  const { tenantId } = await params
  const resolvedSearchParams = await searchParams
  const { tenant } = await getTenantContext(tenantId)

  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const isSlackConnected = tenant.slackConfig?.botToken && tenant.slackConfig?.teamId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-2">
          Connect your workspace with external services to enhance your team&apos;s productivity and conversation management.
        </p>
      </div>

      {/* Success/Error Messages */}
      <Suspense fallback={null}>
        <IntegrationMessages searchParams={resolvedSearchParams} />
      </Suspense>

      {/* Re-authorization notice for existing users */}
      {isSlackConnected && (
        <Alert className="border-orange-200 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            <strong>Enhanced Features Available:</strong> We&apos;ve added new capabilities for private channel management. 
            If you experience any issues joining channels, please disconnect and reconnect your Slack workspace to get the latest permissions.
          </AlertDescription>
        </Alert>
      )}

      {/* Setup Guide for New Users */}
      {!isSlackConnected && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Welcome to your workspace!</strong> Connect your Slack workspace below to start managing conversations, tracking users, and enabling real-time message interactions.
          </AlertDescription>
        </Alert>
      )}

      {/* Slack Integration Card */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-lg">
                <Slack className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Slack</span>
                  {isSlackConnected && (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {!isSlackConnected && (
                    <Badge variant="secondary">Not Connected</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Connect your Slack workspace to enable comprehensive conversation management and user interaction
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isSlackConnected ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Slack integration is active. Your workspace &quot;{tenant.slackConfig?.teamName}&quot; is connected and monitoring conversations.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Team:</span>
                  <p className="text-gray-600">{tenant.slackConfig?.teamName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Team ID:</span>
                  <p className="text-gray-600 font-mono text-xs">{tenant.slackConfig?.teamId}</p>
                </div>
              </div>

              {/* Enhanced Features List */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Available Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <MessageSquare className="h-4 w-4" />
                    <span>Real-time message monitoring</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <Users className="h-4 w-4" />
                    <span>User profile tracking</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <Hash className="h-4 w-4" />
                    <span>Channel management</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-blue-700">
                    <CheckCircle className="h-4 w-4" />
                    <span>Reply & reaction support</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <SlackIntegrationActions 
                tenantId={tenantId} 
                teamName={tenant.slackConfig?.teamName}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Connect your Slack workspace to start managing conversations, tracking users, and enabling powerful message interactions.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">What you&apos;ll get:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Real-time message and event processing</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Automatic user profile tracking and resolution</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Channel subscription management</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Reply to messages and add reactions</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Thread conversation management</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>User impersonation (with authorization)</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <a href={`/api/${tenant.id}/slack/install`} target="_blank" rel="noopener noreferrer">
                  <img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />
                </a>
                <p className="text-xs text-gray-500 mt-2">
                  You&apos;ll be redirected to Slack to authorize the connection with enhanced permissions
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future Integrations Placeholder */}
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">More Integrations Coming Soon</h3>
          <p className="text-gray-500 max-w-sm">
            We&apos;re working on integrations with Microsoft Teams, Discord, and other popular collaboration tools with similar advanced features.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 