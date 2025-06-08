import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { processMessageEvent, processReactionEvent, processThreadReplyEvent, verifySlackSignature } from '@/lib/slack-events'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const body = await req.text()
    const bodyData = JSON.parse(body)
    
    // Handle URL verification challenge
    if (bodyData.type === 'url_verification') {
      return NextResponse.json({ challenge: bodyData.challenge })
    }

    // Get tenant and validate Slack configuration
    const { tenant } = await getTenantContext(tenantId)
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
      const event = bodyData.event
      
      switch (event.type) {
        case 'message':
          // Check if this is a thread reply
          if (event.thread_ts && event.thread_ts !== event.ts) {
            await processThreadReplyEvent(tenantId, event)
          } else {
            // Regular message or thread parent
            await processMessageEvent(tenantId, event)
          }
          break
          
        case 'reaction_added':
          await processReactionEvent(tenantId, event)
          break
          
        case 'reaction_removed':
          await processReactionEvent(tenantId, event, true)
          break
          
        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error processing Slack event:', error)
    return new Response('Internal server error', { status: 500 })
  }
} 