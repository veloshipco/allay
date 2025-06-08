import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { createSlackClient, postMessage, addReaction, fetchChannelInfo } from '@/lib/slack-api'
import { initializeDatabase } from '@/lib/database/config'
import { SlackUser } from '@/lib/database/entities/SlackUser'
import { Conversation } from '@/lib/database/entities/Conversation'

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
        let tokenValid = false
        let slackUser: SlackUser | null = null

        if (asUserId) {
          const dataSource = await initializeDatabase()
          const slackUserRepository = dataSource.getRepository(SlackUser)
          
          slackUser = await slackUserRepository.findOne({
            where: { 
              tenantId, 
              slackUserId: asUserId,
              isActive: true 
            }
          })

          if (slackUser?.userToken) {
            // Validate token before using it
            const { checkAndCleanupUserToken } = await import('@/lib/slack-api')
            tokenValid = await checkAndCleanupUserToken(tenantId, asUserId)
            
            if (tokenValid) {
              userToken = slackUser.userToken
              username = slackUser.displayName || slackUser.realName
              iconUrl = slackUser.profileImage
              
              console.log('✅ Using valid user token for:', {
                userId: asUserId,
                username,
                scopes: slackUser.scopes
              })
            } else {
              console.log('⚠️ User token invalid or revoked, will use bot token with attribution')
            }
          } else {
            console.log('ℹ️ No user token available, will use bot token with attribution')
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
          // Store the sent message in conversations table
          try {
            console.log('🔄 Attempting to store sent message in conversations...')
            const dataSource = await initializeDatabase()
            const conversationRepository = dataSource.getRepository(Conversation)
            
            // Get channel name if possible
            let channelName: string | undefined
            try {
              const channelInfo = await fetchChannelInfo(slackClient, channelId)
              channelName = channelInfo?.name || channelId
              console.log('📡 Fetched channel info:', { channelId, channelName })
            } catch (channelError) {
              console.log('Could not fetch channel info:', channelError)
              channelName = channelId // Fallback to channel ID
            }
            
            // Determine the user info for the sent message
            const userId = asUserId || 'bot-system'
            const userName = result.usedUserToken && slackUser 
              ? (slackUser.displayName || slackUser.realName || slackUser.slackUserId)
              : asUserId && slackUser
                ? `${slackUser.displayName || slackUser.realName || slackUser.slackUserId} (via bot)`
                : 'Allay Bot'
            
            const conversationId = result.ts || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const slackTimestamp = result.ts ? new Date(parseFloat(result.ts) * 1000) : new Date()
            
            console.log('📝 Creating conversation record:', {
              id: conversationId,
              tenantId,
              channelId,
              channelName,
              userId,
              userName,
              messageLength: messageText.length,
              slackTimestamp
            })
            
            const conversation = conversationRepository.create({
              id: conversationId,
              tenantId,
              channelId,
              channelName,
              content: messageText,
              userId,
              userName,
              reactions: [],
              threadReplies: [],
              threadTs: threadTs || undefined,
              slackTimestamp
            })
            
            const savedConversation = await conversationRepository.save(conversation)
            console.log('💾 Successfully stored sent message in conversations:', {
              id: savedConversation.id,
              channelId: savedConversation.channelId,
              channelName: savedConversation.channelName,
              userId: savedConversation.userId,
              userName: savedConversation.userName,
              messageLength: savedConversation.content.length
            })
          } catch (storageError) {
            console.error('⚠️ Failed to store sent message in conversations:', storageError)
            console.error('Storage error details:', {
              error: storageError instanceof Error ? storageError.message : storageError,
              stack: storageError instanceof Error ? storageError.stack : undefined
            })
            // Don't fail the request if storage fails
          }

          const responseMessage = result.usedUserToken 
            ? `Message sent successfully as ${username} and stored in conversations`
            : action === 'reply' 
              ? 'Reply sent successfully (via bot with attribution) and stored in conversations' 
              : 'Message posted successfully (via bot with attribution) and stored in conversations'

          return NextResponse.json({
            success: true,
            message: responseMessage,
            messageTs: result.ts,
            asUser: result.usedUserToken,
            username: result.usedUserToken ? username : undefined,
            needsReauth: asUserId && !tokenValid && !slackUser?.userToken // User requested but no token
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