/* eslint-disable @next/next/no-img-element */
import { getTenantContext } from '@/lib/tenant'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slack, CheckCircle, Settings, AlertTriangle, Info } from 'lucide-react'
import { Suspense } from 'react'

interface PageProps {
  params: Promise<{ tenantId: string }>
  searchParams: Promise<{ success?: string; error?: string }>
}

function IntegrationMessages({ searchParams }: { searchParams: { success?: string; error?: string } }) {
  if (searchParams.success === 'true') {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          Slack integration connected successfully! You can now start receiving events from your Slack workspace.
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
          Connect your workspace with external services to enhance your team&apos;s productivity.
        </p>
      </div>

      {/* Success/Error Messages */}
      <Suspense fallback={null}>
        <IntegrationMessages searchParams={resolvedSearchParams} />
      </Suspense>

      {/* Setup Guide for New Users */}
      {!isSlackConnected && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            <strong>Welcome to your workspace!</strong> Connect your Slack workspace below to start managing conversations and receiving real-time events.
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
                  Connect your Slack workspace to enable real-time conversation management
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
                  Slack integration is active. Your workspace &quot;{tenant.slackConfig?.teamName}&quot; is connected.
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

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• Your Slack workspace is now connected and ready to receive events</li>
                  <li>• Messages and reactions will be automatically synced</li>
                  <li>• Visit the dashboard to view conversation analytics</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Settings
                </Button>
                <Button variant="destructive" size="sm">
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Connect your Slack workspace to start managing conversations and receiving real-time events.
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
                    <span>Conversation management and analytics</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Team collaboration tools integration</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Automated workflow triggers</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4">
                <a href={`/api/${tenant.id}/slack/install`}>
                  <img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />
                </a>
                <p className="text-xs text-gray-500 mt-2">
                  You&apos;ll be redirected to Slack to authorize the connection
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Other Integrations Placeholder */}
      <Card className="border-dashed border-2 border-gray-200">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">More Integrations Coming Soon</h3>
          <p className="text-gray-500 max-w-sm">
            We&apos;re working on integrations with Microsoft Teams, Discord, and other popular collaboration tools.
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 