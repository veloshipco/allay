import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { createSlackClient, getChannelList, joinChannel, fetchChannelInfo } from '@/lib/slack-api'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { tenant } = await getTenantContext(tenantId)

    if (!tenant?.slackConfig?.botToken) {
      return NextResponse.json(
        { error: 'Slack not configured for this tenant' },
        { status: 404 }
      )
    }

    const slackClient = await createSlackClient(tenant.slackConfig.botToken)
    const channels = await getChannelList(slackClient)

    return NextResponse.json({
      channels,
      total: channels.length,
      joinedChannels: channels.filter(c => c.isMember).length
    })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { action, channelId } = await req.json()

    if (!action || !channelId) {
      return NextResponse.json(
        { error: 'Missing action or channelId' },
        { status: 400 }
      )
    }

    const { tenant } = await getTenantContext(tenantId)

    if (!tenant?.slackConfig?.botToken) {
      return NextResponse.json(
        { error: 'Slack not configured for this tenant' },
        { status: 404 }
      )
    }

    const slackClient = await createSlackClient(tenant.slackConfig.botToken)

    switch (action) {
      case 'join':
        const joinSuccess = await joinChannel(slackClient, channelId)
        if (joinSuccess) {
          const channelInfo = await fetchChannelInfo(slackClient, channelId)
          return NextResponse.json({
            success: true,
            message: `Successfully joined channel #${channelInfo?.name || channelId}`,
            channel: channelInfo
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to join channel' },
            { status: 400 }
          )
        }

      case 'info':
        const channelInfo = await fetchChannelInfo(slackClient, channelId)
        if (channelInfo) {
          return NextResponse.json({ channel: channelInfo })
        } else {
          return NextResponse.json(
            { error: 'Channel not found or not accessible' },
            { status: 404 }
          )
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error managing channel:', error)
    return NextResponse.json(
      { error: 'Failed to manage channel' },
      { status: 500 }
    )
  }
} 