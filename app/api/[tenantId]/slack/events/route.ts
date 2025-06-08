import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { processMessageEvent, processReactionEvent, verifySlackSignature } from '@/lib/slack-events'

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  try {
    const body = await req.text()
    const bodyData = JSON.parse(body)
    
    // Handle URL verification challenge
    if (bodyData.type === 'url_verification') {
      return NextResponse.json({ challenge: bodyData.challenge })
    }

    // Get tenant and validate Slack configuration
    const { tenant } = await getTenantContext(params.tenantId)
    if (!tenant || !tenant.slackConfig?.signingSecret) {
      return new Response('Tenant not configured for Slack', { status: 404 })
    }

    // Verify Slack signature
    const timestamp = req.headers.get('x-slack-request-timestamp')
    const signature = req.headers.get('x-slack-signature')
    
    const isValid = await verifySlackSignature(
      body,
      timestamp,
      signature,
      tenant.slackConfig.signingSecret
    )
    
    if (!isValid) {
      return new Response('Invalid signature', { status: 401 })
    }

    // Process different event types
    if (bodyData.event) {
      switch (bodyData.event.type) {
        case 'message':
          await processMessageEvent(params.tenantId, bodyData.event)
          break
        case 'reaction_added':
          await processReactionEvent(params.tenantId, bodyData.event)
          break
        case 'reaction_removed':
          await processReactionEvent(params.tenantId, bodyData.event, true)
          break
        default:
          console.log(`Unhandled event type: ${bodyData.event.type}`)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error processing Slack event:', error)
    return new Response('Internal server error', { status: 500 })
  }
} 