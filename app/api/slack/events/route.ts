import { NextRequest, NextResponse } from 'next/server'
import { processMessageEvent, processReactionEvent, processThreadReplyEvent, verifySlackSignature } from '@/lib/slack-events'
import { addDebugEvent } from '@/app/api/debug/slack-events/route'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const bodyData = JSON.parse(body)
    
    // Handle URL verification challenge
    if (bodyData.type === 'url_verification') {
      const response = NextResponse.json({ challenge: bodyData.challenge })
      response.headers.set('Content-Type', 'application/json')
      return response
    }

    // Get team ID from the event to find the corresponding tenant
    const teamId = bodyData.team_id
    
    if (!teamId) {
      return new Response('Missing team ID', { status: 400 })
    }

    // Find tenant by Slack team ID
    const { initializeDatabase } = await import('@/lib/database/config')
    const { Tenant } = await import('@/lib/database/entities/Tenant')
    
    const dataSource = await initializeDatabase()
    const tenantRepository = dataSource.getRepository(Tenant)
    
    const tenant = await tenantRepository
      .createQueryBuilder('tenant')
      .where("tenant.\"slackConfig\"->>'teamId' = :teamId", { teamId })
      .andWhere('tenant.isActive = :isActive', { isActive: true })
      .getOne()

    if (!tenant) {
      return new Response('Tenant not found', { status: 404 })
    }
    
    if (!tenant.slackConfig?.signingSecret) {
      return new Response('Tenant not configured', { status: 404 })
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
      
      // Log event for debugging
      addDebugEvent(event)
      
      switch (event.type) {
        case 'message':
          // Skip bot messages and certain subtypes
          if (event.bot_id || event.subtype === 'bot_message') {
            break
          }
          
          // Check if this is a thread reply
          if (event.thread_ts && event.thread_ts !== event.ts) {
            await processThreadReplyEvent(tenant.id, event)
          } else {
            // Regular message or thread parent
            await processMessageEvent(tenant.id, event)
          }
          break
          
        case 'reaction_added':
          await processReactionEvent(tenant.id, event)
          break
          
        case 'reaction_removed':
          await processReactionEvent(tenant.id, event, true)
          break
          
        default:
          console.log(`❓ Unhandled event type: ${event.type}`)
      }
    } else {
      console.log('⚠️ No event data in payload')
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('💥 Error processing Slack event:', error)
    return new Response('Internal server error', { status: 500 })
  }
} 