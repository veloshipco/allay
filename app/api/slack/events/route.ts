import { NextRequest, NextResponse } from 'next/server'
import { processMessageEvent, processReactionEvent, processThreadReplyEvent, verifySlackSignature } from '@/lib/slack-events'

export async function POST(req: NextRequest) {
  console.log('🔔 Slack event received!')
  console.log('📡 Request headers:', Object.fromEntries(req.headers.entries()))
  
  try {
    const body = await req.text()
    const bodyData = JSON.parse(body)
    
    console.log('📥 Event data:', JSON.stringify(bodyData, null, 2))
    
    // Handle URL verification challenge
    if (bodyData.type === 'url_verification') {
      console.log('✅ URL verification challenge received')
      const response = NextResponse.json({ challenge: bodyData.challenge })
      // Add headers to bypass ngrok warning
      response.headers.set('ngrok-skip-browser-warning', 'true')
      return response
    }

    // Get team ID from the event to find the corresponding tenant
    const teamId = bodyData.team_id
    console.log('🏢 Team ID:', teamId)
    
    if (!teamId) {
      console.log('❌ Missing team ID')
      return new Response('Missing team ID', { status: 400 })
    }

    // Find tenant by Slack team ID
    const { initializeDatabase } = await import('@/lib/database/config')
    const { Tenant } = await import('@/lib/database/entities/Tenant')
    
    const dataSource = await initializeDatabase()
    const tenantRepository = dataSource.getRepository(Tenant)
    
    console.log('🔍 Looking for tenant with team ID:', teamId)
    
    const tenant = await tenantRepository
      .createQueryBuilder('tenant')
      .where("tenant.\"slackConfig\"->>'teamId' = :teamId", { teamId })
      .andWhere('tenant.isActive = :isActive', { isActive: true })
      .getOne()

    if (!tenant) {
      console.log('❌ No tenant found for team ID:', teamId)
      
      // Debug: Let's see what tenants exist
      const allTenants = await tenantRepository.find({
        select: ['id', 'name', 'slackConfig']
      })
      console.log('📋 All tenants in database:', allTenants.map(t => ({
        id: t.id,
        name: t.name,
        teamId: t.slackConfig?.teamId
      })))
      
      return new Response('Tenant not found', { status: 404 })
    }
    
    if (!tenant.slackConfig?.signingSecret) {
      console.log('❌ Tenant found but no signing secret:', tenant.id)
      return new Response('Tenant not configured', { status: 404 })
    }

    console.log('✅ Found tenant:', tenant.id, tenant.name)

    // Verify Slack signature
    const timestamp = req.headers.get('x-slack-request-timestamp')
    const signature = req.headers.get('x-slack-signature')
    
    console.log('🔐 Verifying signature...')
    
    const isValid = await verifySlackSignature(
      body,
      timestamp,
      signature,
      tenant.slackConfig.signingSecret
    )
    
    if (!isValid) {
      console.log('❌ Invalid signature')
      return new Response('Invalid signature', { status: 401 })
    }

    console.log('✅ Signature verified')

    // Process different event types
    if (bodyData.event) {
      const event = bodyData.event
      console.log('🎯 Processing event type:', event.type)
      console.log('📝 Event details:', JSON.stringify(event, null, 2))
      
      switch (event.type) {
        case 'message':
          // Skip bot messages and certain subtypes
          if (event.bot_id || event.subtype === 'bot_message') {
            console.log('⏭️ Skipping bot message')
            break
          }
          
          console.log('💬 Processing message event...')
          
          // Check if this is a thread reply
          if (event.thread_ts && event.thread_ts !== event.ts) {
            console.log('🧵 Processing thread reply')
            await processThreadReplyEvent(tenant.id, event)
          } else {
            // Regular message or thread parent
            console.log('📄 Processing regular message')
            await processMessageEvent(tenant.id, event)
          }
          
          console.log('✅ Message processed successfully')
          break
          
        case 'reaction_added':
          console.log('😀 Processing reaction added')
          await processReactionEvent(tenant.id, event)
          break
          
        case 'reaction_removed':
          console.log('😐 Processing reaction removed')
          await processReactionEvent(tenant.id, event, true)
          break
          
        default:
          console.log(`❓ Unhandled event type: ${event.type}`)
      }
    } else {
      console.log('⚠️ No event data in payload')
    }

    console.log('🎉 Event processing completed')
    const response = NextResponse.json({ status: 'ok' })
    response.headers.set('ngrok-skip-browser-warning', 'true')
    return response
  } catch (error) {
    console.error('💥 Error processing Slack event:', error)
    return new Response('Internal server error', { status: 500 })
  }
} 