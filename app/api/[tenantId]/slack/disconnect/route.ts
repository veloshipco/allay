import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { initializeDatabase } from '@/lib/database/config'
import { Tenant } from '@/lib/database/entities/Tenant'
import { Conversation } from '@/lib/database/entities/Conversation'
import { SlackUser } from '@/lib/database/entities/SlackUser'
import { revokeSlackToken } from '@/lib/slack-api'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { confirmDisconnect } = await req.json()

    if (!confirmDisconnect) {
      return NextResponse.json(
        { error: 'Confirmation required to disconnect' },
        { status: 400 }
      )
    }

    const { tenant } = await getTenantContext(tenantId)

    if (!tenant?.slackConfig?.botToken) {
      return NextResponse.json(
        { error: 'Slack integration not found' },
        { status: 404 }
      )
    }

    const dataSource = await initializeDatabase()
    const tenantRepository = dataSource.getRepository(Tenant)
    const conversationRepository = dataSource.getRepository(Conversation)
    const slackUserRepository = dataSource.getRepository(SlackUser)

    // Store the bot token before clearing config
    const botToken = tenant.slackConfig.botToken

    console.log(`Starting complete Slack disconnection for tenant: ${tenantId}`)

    // Step 1: Revoke the OAuth token to uninstall the app from Slack workspace
    try {
      const revokeSuccess = await revokeSlackToken(botToken)
      if (!revokeSuccess) {
        console.warn('Failed to revoke token on Slack side, but continuing with local cleanup')
      }
    } catch (error) {
      console.warn('Error revoking Slack token, but continuing with local cleanup:', error)
    }

    // Step 2: Clear ALL Slack-related data (regardless of clearData flag for complete reset)
    try {
      // Delete all conversations for this tenant
      const deletedConversations = await conversationRepository.delete({ tenantId })
      console.log(`Deleted ${deletedConversations.affected || 0} conversations for tenant: ${tenantId}`)
      
      // Delete all slack users for this tenant
      const deletedUsers = await slackUserRepository.delete({ tenantId })
      console.log(`Deleted ${deletedUsers.affected || 0} Slack users for tenant: ${tenantId}`)
    } catch (error) {
      console.error('Error clearing Slack data:', error)
      // Continue with config clearing even if data deletion fails
    }

    // Step 3: Completely clear Slack configuration from tenant
    try {
      // Clear the slackConfig completely
      tenant.slackConfig = undefined
      await tenantRepository.save(tenant)
      
      // Verify the update by fetching fresh copy from database
      const verifiedTenant = await tenantRepository.findOne({ 
        where: { id: tenantId },
        cache: false
      })
      
      if (verifiedTenant?.slackConfig) {
        throw new Error('Database update failed - slackConfig still exists')
      }
      
    } catch (saveError) {
      console.error('Error clearing tenant configuration:', saveError)
      throw saveError
    }

    console.log(`Successfully completed Slack disconnection and reset for tenant: ${tenantId}`)

    return NextResponse.json({
      success: true,
      message: 'Slack integration completely disconnected and uninstalled. All data has been cleared.',
      appUninstalled: true,
      dataCleared: true,
      tenantReset: true
    })
  } catch (error) {
    console.error('Error during complete Slack disconnection:', error)
    return NextResponse.json(
      { 
        error: 'Failed to completely disconnect Slack integration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 