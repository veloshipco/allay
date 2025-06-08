import { initializeDatabase } from './database/config'
import { SlackUser } from './database/entities/SlackUser'
import { SlackChannel } from './database/entities/types'

export interface SlackApiClient {
  botToken: string
  userToken?: string
}

export interface SlackUserProfile {
  id: string
  name: string
  real_name?: string
  display_name?: string
  email?: string
  image_72?: string
  title?: string
  is_bot: boolean
  is_admin: boolean
  is_owner: boolean
  tz?: string
}

export interface SlackChannelInfo {
  id: string
  name: string
  is_private: boolean
  is_member: boolean
  is_archived: boolean
  topic?: { value: string }
  purpose?: { value: string }
  num_members?: number
}

export async function createSlackClient(botToken: string, userToken?: string): Promise<SlackApiClient> {
  return { botToken, userToken }
}

export async function fetchUserInfo(client: SlackApiClient, userId: string): Promise<SlackUserProfile | null> {
  try {
    const response = await fetch('https://slack.com/api/users.info', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ user: userId })
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return null
    }

    const user = data.user
    return {
      id: user.id,
      name: user.name,
      real_name: user.real_name,
      display_name: user.profile?.display_name,
      email: user.profile?.email,
      image_72: user.profile?.image_72,
      title: user.profile?.title,
      is_bot: user.is_bot || false,
      is_admin: user.is_admin || false,
      is_owner: user.is_owner || false,
      tz: user.tz
    }
  } catch (error) {
    console.error('Error fetching user info:', error)
    return null
  }
}

export async function getOrCreateSlackUser(tenantId: string, slackUserId: string, client: SlackApiClient): Promise<SlackUser | null> {
  try {
    const dataSource = await initializeDatabase()
    const slackUserRepository = dataSource.getRepository(SlackUser)
    
    const compositeId = `${tenantId}-${slackUserId}`
    
    // Check if user already exists
    let slackUser = await slackUserRepository.findOne({
      where: { id: compositeId, tenantId, slackUserId }
    })

    if (slackUser) {
      // Update last seen
      slackUser.lastSeenAt = new Date()
      await slackUserRepository.save(slackUser)
      return slackUser
    }

    // Fetch user info from Slack API
    const userProfile = await fetchUserInfo(client, slackUserId)
    if (!userProfile) {
      return null
    }

    // Create new slack user record
    slackUser = slackUserRepository.create({
      id: compositeId,
      tenantId,
      slackUserId,
      realName: userProfile.real_name,
      displayName: userProfile.display_name,
      email: userProfile.email,
      profileImage: userProfile.image_72,
      title: userProfile.title,
      isBot: userProfile.is_bot,
      isAdmin: userProfile.is_admin,
      isOwner: userProfile.is_owner,
      timezone: userProfile.tz,
      lastSeenAt: new Date()
    })

    await slackUserRepository.save(slackUser)
    console.log(`Created new Slack user record: ${userProfile.real_name || userProfile.name} (${slackUserId})`)
    
    return slackUser
  } catch (error) {
    console.error('Error creating/fetching Slack user:', error)
    return null
  }
}

export async function fetchChannelInfo(client: SlackApiClient, channelId: string): Promise<SlackChannelInfo | null> {
  try {
    const response = await fetch('https://slack.com/api/conversations.info', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ channel: channelId })
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return null
    }

    const channel = data.channel
    return {
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private || false,
      is_member: channel.is_member || false,
      is_archived: channel.is_archived || false,
      topic: channel.topic,
      purpose: channel.purpose,
      num_members: channel.num_members
    }
  } catch (error) {
    console.error('Error fetching channel info:', error)
    return null
  }
}

export async function joinChannel(client: SlackApiClient, channelId: string): Promise<boolean> {
  try {
    const response = await fetch('https://slack.com/api/conversations.join', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ channel: channelId })
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Error joining channel:', data.error)
      return false
    }

    console.log(`Successfully joined channel: ${channelId}`)
    return true
  } catch (error) {
    console.error('Error joining channel:', error)
    return false
  }
}

export async function getChannelList(client: SlackApiClient): Promise<SlackChannel[]> {
  try {
    const response = await fetch('https://slack.com/api/conversations.list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ 
        types: 'public_channel,private_channel',
        exclude_archived: 'true'
      })
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return []
    }

    interface SlackChannelResponse {
      id: string
      name: string
      is_private?: boolean
      is_member?: boolean
      is_archived?: boolean
      topic?: { value: string }
      purpose?: { value: string }
      num_members?: number
    }

    return (data.channels as SlackChannelResponse[]).map((channel): SlackChannel => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private || false,
      isMember: channel.is_member || false,
      isArchived: channel.is_archived || false,
      topic: channel.topic?.value,
      purpose: channel.purpose?.value,
      memberCount: channel.num_members
    }))
  } catch (error) {
    console.error('Error fetching channel list:', error)
    return []
  }
}

export async function postMessage(
  client: SlackApiClient, 
  channelId: string, 
  text: string, 
  options: {
    asUser?: boolean
    threadTs?: string
    username?: string
    iconUrl?: string
  } = {}
): Promise<{ success: boolean; ts?: string; error?: string; usedUserToken?: boolean }> {
  let attemptedUserToken = false
  
  try {
    // Try user token first if available and requested
    if (options.asUser && client.userToken) {
      attemptedUserToken = true
      
      const userBody = new URLSearchParams({
        channel: channelId,
        text: text
      })

      if (options.threadTs) {
        userBody.append('thread_ts', options.threadTs)
      }

      try {
        const userResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${client.userToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: userBody
        })

        const userData = await userResponse.json()
        
        if (userData.ok) {
          console.log('✅ Message posted successfully using user token')
          return { success: true, ts: userData.ts, usedUserToken: true }
        } else {
          console.warn('⚠️ User token failed, falling back to bot token:', userData.error)
          
          // If user token fails, we'll fall through to bot token
          if (userData.error === 'token_revoked' || userData.error === 'account_inactive') {
            console.log('🔄 User token appears to be revoked or inactive')
          }
        }
      } catch (userTokenError) {
        console.warn('⚠️ User token request failed, falling back to bot token:', userTokenError)
      }
    }

    // Fallback to bot token with attribution
    const botBody = new URLSearchParams({
      channel: channelId,
      text: text
    })

    if (options.threadTs) {
      botBody.append('thread_ts', options.threadTs)
    }

    // Add attribution when using bot token
    if (attemptedUserToken) {
      if (options.username) {
        botBody.append('username', options.username)
      }
      if (options.iconUrl) {
        botBody.append('icon_url', options.iconUrl)
      }
    }

    const botResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: botBody
    })

    const botData = await botResponse.json()
    
    if (!botData.ok) {
      console.error('❌ Bot token also failed:', botData.error)
      return { success: false, error: botData.error, usedUserToken: false }
    }

    const logMessage = attemptedUserToken 
      ? '✅ Message posted using bot token (user token fallback)'
      : '✅ Message posted using bot token'
    console.log(logMessage)

    return { success: true, ts: botData.ts, usedUserToken: false }
  } catch (error) {
    console.error('❌ Error posting message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', usedUserToken: false }
  }
}

export async function addReaction(
  client: SlackApiClient,
  channelId: string,
  timestamp: string,
  reactionName: string
): Promise<boolean> {
  try {
    const response = await fetch('https://slack.com/api/reactions.add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${client.botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        channel: channelId,
        timestamp: timestamp,
        name: reactionName
      })
    })

    const data = await response.json()
    
    if (!data.ok && data.error !== 'already_reacted') {
      console.error('Error adding reaction:', data.error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error adding reaction:', error)
    return false
  }
}

export async function revokeSlackToken(botToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://slack.com/api/auth.revoke', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    const data = await response.json()
    
    if (!data.ok) {
      console.error('Error revoking Slack token:', data.error)
      return false
    }

    console.log('Successfully revoked Slack token and uninstalled app')
    return true
  } catch (error) {
    console.error('Error revoking Slack token:', error)
    return false
  }
}

export async function revokeUserToken(tenantId: string, userId: string): Promise<boolean> {
  try {
    const dataSource = await initializeDatabase()
    const slackUserRepository = dataSource.getRepository(SlackUser)
    
    const compositeId = `${tenantId}-${userId}`
    const slackUser = await slackUserRepository.findOne({
      where: { id: compositeId, tenantId, slackUserId: userId }
    })

    if (!slackUser?.userToken) {
      console.log(`No user token found for user ${userId}`)
      return true
    }

    // Revoke the token on Slack's side
    try {
      const response = await fetch('https://slack.com/api/auth.revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${slackUser.userToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })

      const data = await response.json()
      
      if (!data.ok && data.error !== 'token_revoked') {
        console.warn('Warning revoking user token on Slack side:', data.error)
      }
    } catch (revokeError) {
      console.warn('Failed to revoke user token on Slack side, continuing with local cleanup:', revokeError)
    }

    // Clear the token from our database
    slackUser.userToken = undefined
    slackUser.scopes = undefined
    slackUser.tokenExpiresAt = undefined
    slackUser.isActive = true // Keep user record but remove token
    
    await slackUserRepository.save(slackUser)
    
    console.log(`Successfully cleaned up user token for ${userId}`)
    return true
  } catch (error) {
    console.error('Error handling user token revocation:', error)
    return false
  }
}

export async function checkAndCleanupUserToken(tenantId: string, userId: string): Promise<boolean> {
  try {
    const dataSource = await initializeDatabase()
    const slackUserRepository = dataSource.getRepository(SlackUser)
    
    const compositeId = `${tenantId}-${userId}`
    const slackUser = await slackUserRepository.findOne({
      where: { id: compositeId, tenantId, slackUserId: userId }
    })

    if (!slackUser?.userToken) {
      return false
    }

    // Test the token with a simple API call
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${slackUser.userToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      })

      const data = await response.json()
      
      if (data.ok) {
        return true // Token is valid
      } else {
        // Token is invalid, clean it up
        console.log(`Invalid user token detected for ${userId}, cleaning up:`, data.error)
        await revokeUserToken(tenantId, userId)
        return false
      }
    } catch (testError) {
      console.warn('Failed to test user token, assuming invalid:', testError)
      await revokeUserToken(tenantId, userId)
      return false
    }
  } catch (error) {
    console.error('Error checking user token:', error)
    return false
  }
} 