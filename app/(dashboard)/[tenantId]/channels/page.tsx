import { getTenantContext } from '@/lib/tenant'
import ChannelManagement from '@/components/channel-management'
import { Hash } from 'lucide-react'

interface PageProps {
  params: Promise<{ tenantId: string }>
}

export default async function ChannelsPage({ params }: PageProps) {
  const { tenantId } = await params
  const { tenant } = await getTenantContext(tenantId)

  if (!tenant) {
    return <div>Tenant not found</div>
  }

  const isSlackConnected = tenant.slackConfig?.botToken && tenant.slackConfig?.teamId

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
          <Hash className="h-8 w-8" />
          <span>Channels</span>
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your Slack channel subscriptions and monitor which channels your bot can access.
        </p>
      </div>

      {isSlackConnected ? (
        <ChannelManagement tenantId={tenantId} />
      ) : (
        <div className="text-center py-12">
          <Hash className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Slack Not Connected</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-4">
            Connect your Slack workspace to start managing channels and monitoring conversations.
          </p>
          <a href={`/${tenantId}/integrations`} className="text-blue-600 hover:text-blue-800">
            Go to Integrations →
          </a>
        </div>
      )}
    </div>
  )
} 