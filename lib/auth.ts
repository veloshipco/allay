import { getTenantContext } from './tenant'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { initializeDatabase } from './database/config'
import { User } from './database/entities/User'
import { Session } from './database/entities/Session'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const SESSION_COOKIE_NAME = 'allay-session'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
}

export interface SessionData {
  user: AuthUser
  sessionId: string
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

export const generateSessionToken = (userId: string, sessionId: string): string => {
  return jwt.sign(
    { userId, sessionId },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export const verifySessionToken = (token: string): { userId: string; sessionId: string } | null => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; sessionId: string }
    return { userId: payload.userId, sessionId: payload.sessionId }
  } catch {
    return null
  }
}

export const createSession = async (
  userId: string, 
  ipAddress: string, 
  userAgent: string
): Promise<Session> => {
  const dataSource = await initializeDatabase()
  const sessionRepository = dataSource.getRepository(Session)
  
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  const session = sessionRepository.create({
    userId,
    token: generateSessionToken(userId, ''), // Will update after saving
    ipAddress,
    userAgent,
    expiresAt
  })

  const savedSession = await sessionRepository.save(session)
  
  // Update token with actual session ID
  savedSession.token = generateSessionToken(userId, savedSession.id)
  await sessionRepository.save(savedSession)
  
  return savedSession
}

export const getSession = async (): Promise<SessionData | null> => {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      return null
    }

    const tokenData = verifySessionToken(sessionToken)
    if (!tokenData) {
      return null
    }

    const dataSource = await initializeDatabase()
    const sessionRepository = dataSource.getRepository(Session)
    const userRepository = dataSource.getRepository(User)

    const session = await sessionRepository.findOne({
      where: { 
        id: tokenData.sessionId, 
        isRevoked: false 
      }
    })

    if (!session || session.expiresAt < new Date()) {
      return null
    }

    const user = await userRepository.findOne({
      where: { id: tokenData.userId, isActive: true }
    })

    if (!user) {
      return null
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      sessionId: session.id
    }
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

export const invalidateSession = async (sessionId: string): Promise<void> => {
  try {
    const dataSource = await initializeDatabase()
    const sessionRepository = dataSource.getRepository(Session)
    
    await sessionRepository.update(
      { id: sessionId },
      { isRevoked: true }
    )
  } catch (error) {
    console.error('Error invalidating session:', error)
  }
}

export const validateTenantAccess = async (tenantId: string) => {
  const { tenant, error } = await getTenantContext(tenantId)
  
  if (!tenant || error) {
    redirect('/unauthorized')
  }
  
  return tenant
}

export const checkTenantAccess = async (userId: string, tenantId: string): Promise<boolean> => {
  try {
    const dataSource = await initializeDatabase()
    const userRepository = dataSource.getRepository(User)
    
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ['tenants']
    })

    if (!user) {
      return false
    }

    return user.tenants.some(tenant => tenant.id === tenantId)
  } catch (error) {
    console.error('Error checking tenant access:', error)
    return false
  }
}

export const addUserToTenant = async (userId: string, tenantId: string): Promise<boolean> => {
  try {
    const dataSource = await initializeDatabase()
    const userRepository = dataSource.getRepository(User)
    
    const user = await userRepository.findOne({
      where: { id: userId },
      relations: ['tenants']
    })

    const { tenant } = await getTenantContext(tenantId)
    
    if (!user || !tenant) {
      return false
    }

    // Check if user is already associated with tenant
    if (!user.tenants.some(t => t.id === tenantId)) {
      user.tenants.push(tenant)
      await userRepository.save(user)
    }

    return true
  } catch (error) {
    console.error('Error adding user to tenant:', error)
    return false
  }
}

export const redirectToLogin = (req: NextRequest) => {
  const url = new URL('/login', req.url)
  url.searchParams.set('callbackUrl', req.url)
  return Response.redirect(url)
}

export const setSessionCookie = async (sessionToken: string) => {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  })
}

export const clearSessionCookie = async () => {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
} 