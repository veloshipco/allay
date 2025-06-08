import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { createSlackClient, postMessage, addReaction } from '@/lib/slack-api'
import { initializeDatabase } from '@/lib/database/config'
import { SlackUser } from '@/lib/database/entities/SlackUser'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { 
      action, 
      channelId, 
      messageText, 
      threadTs, 
      asUserId, 
      messageTs,
      reactionName 
    } = await req.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action' },
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

    switch (action) {
      case 'post_message':
      case 'reply':
        if (!channelId || !messageText) {
          return NextResponse.json(
            { error: 'Missing channelId or messageText' },
            { status: 400 }
          )
        }

        // Check if we should post as a specific user
        let userToken: string | undefined
        let username: string | undefined
        let iconUrl: string | undefined

        if (asUserId) {
          const dataSource = await initializeDatabase()
          const slackUserRepository = dataSource.getRepository(SlackUser)
          
          const slackUser = await slackUserRepository.findOne({
            where: { 
              tenantId, 
              slackUserId: asUserId,
              isActive: true 
            }
          })

          if (slackUser?.userToken) {
            userToken = slackUser.userToken
            username = slackUser.displayName || slackUser.realName
            iconUrl = slackUser.profileImage
          }
        }

        const slackClient = await createSlackClient(
          tenant.slackConfig.botToken,
          userToken
        )

        const result = await postMessage(
          slackClient,
          channelId,
          messageText,
          {
            asUser: !!userToken,
            threadTs: threadTs,
            username: username,
            iconUrl: iconUrl
          }
        )

        if (result.success) {
          return NextResponse.json({
            success: true,
            message: action === 'reply' ? 'Reply sent successfully' : 'Message posted successfully',
            messageTs: result.ts,
            asUser: !!userToken,
            username: username
          })
        } else {
          return NextResponse.json(
            { error: result.error || 'Failed to send message' },
            { status: 400 }
          )
        }

      case 'add_reaction':
        if (!channelId || !messageTs || !reactionName) {
          return NextResponse.json(
            { error: 'Missing channelId, messageTs, or reactionName' },
            { status: 400 }
          )
        }

        const reactionClient = await createSlackClient(tenant.slackConfig.botToken)
        const reactionSuccess = await addReaction(
          reactionClient,
          channelId,
          messageTs,
          reactionName
        )

        if (reactionSuccess) {
          return NextResponse.json({
            success: true,
            message: 'Reaction added successfully'
          })
        } else {
          return NextResponse.json(
            { error: 'Failed to add reaction' },
            { status: 400 }
          )
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error handling Slack reply:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
} 