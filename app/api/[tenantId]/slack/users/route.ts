import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/tenant'
import { initializeDatabase } from '@/lib/database/config'
import { SlackUser } from '@/lib/database/entities/SlackUser'

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

    const dataSource = await initializeDatabase()
    const slackUserRepository = dataSource.getRepository(SlackUser)

    const searchParams = new URL(req.url).searchParams
    const includeInactive = searchParams.get('includeInactive') === 'true'
    const search = searchParams.get('search')

    let query = slackUserRepository
      .createQueryBuilder('slack_user')
      .where('slack_user.tenantId = :tenantId', { tenantId })

    if (!includeInactive) {
      query = query.andWhere('slack_user.isActive = :isActive', { isActive: true })
    }

    if (search) {
      query = query.andWhere(
        '(slack_user.realName ILIKE :search OR slack_user.displayName ILIKE :search OR slack_user.email ILIKE :search)',
        { search: `%${search}%` }
      )
    }

    const users = await query
      .orderBy('slack_user.lastSeenAt', 'DESC')
      .addOrderBy('slack_user.realName', 'ASC')
      .getMany()

    // Remove sensitive data from response
    const safeUsers = users.map(user => ({
      id: user.id,
      slackUserId: user.slackUserId,
      realName: user.realName,
      displayName: user.displayName,
      email: user.email,
      profileImage: user.profileImage,
      title: user.title,
      isBot: user.isBot,
      isAdmin: user.isAdmin,
      isOwner: user.isOwner,
      timezone: user.timezone,
      userToken: user.userToken ? 'present' : undefined,
      hasUserToken: !!user.userToken,
      tokenExpired: user.tokenExpiresAt ? new Date() > user.tokenExpiresAt : false,
      scopes: user.scopes || [],
      isActive: user.isActive,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt
    }))

    const stats = {
      total: users.length,
      withTokens: users.filter(u => u.userToken).length,
      bots: users.filter(u => u.isBot).length,
      admins: users.filter(u => u.isAdmin).length,
      active: users.filter(u => u.isActive).length
    }

    return NextResponse.json({
      users: safeUsers,
      stats
    })
  } catch (error) {
    console.error('Error fetching Slack users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { slackUserId, action, userToken, scopes, expiresAt } = await req.json()

    if (!slackUserId || !action) {
      return NextResponse.json(
        { error: 'Missing slackUserId or action' },
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

    const dataSource = await initializeDatabase()
    const slackUserRepository = dataSource.getRepository(SlackUser)

    const slackUser = await slackUserRepository.findOne({
      where: { tenantId, slackUserId }
    })

    if (!slackUser) {
      return NextResponse.json(
        { error: 'Slack user not found' },
        { status: 404 }
      )
    }

    switch (action) {
      case 'add_token':
        if (!userToken || !scopes) {
          return NextResponse.json(
            { error: 'Missing userToken or scopes' },
            { status: 400 }
          )
        }

        slackUser.userToken = userToken
        slackUser.scopes = scopes
        slackUser.tokenExpiresAt = expiresAt ? new Date(expiresAt) : undefined
        
        await slackUserRepository.save(slackUser)

        return NextResponse.json({
          success: true,
          message: 'User token added successfully',
          user: {
            slackUserId: slackUser.slackUserId,
            realName: slackUser.realName,
            hasUserToken: true,
            scopes: slackUser.scopes
          }
        })

      case 'remove_token':
        slackUser.userToken = undefined
        slackUser.scopes = undefined
        slackUser.tokenExpiresAt = undefined
        
        await slackUserRepository.save(slackUser)

        return NextResponse.json({
          success: true,
          message: 'User token removed successfully'
        })

      case 'toggle_active':
        slackUser.isActive = !slackUser.isActive
        await slackUserRepository.save(slackUser)

        return NextResponse.json({
          success: true,
          message: `User ${slackUser.isActive ? 'activated' : 'deactivated'} successfully`,
          isActive: slackUser.isActive
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error updating Slack user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
} 