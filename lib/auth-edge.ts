import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const SESSION_COOKIE_NAME = 'allay-session'

export interface EdgeSessionData {
  userId: string
  sessionId: string
}

// Base64 URL decode function
function base64UrlDecode(str: string): string {
  // Add padding if needed
  str += '='.repeat((4 - str.length % 4) % 4)
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  return atob(str)
}

// JWT verification for Edge runtime using Web Crypto API
async function verifyJWT(token: string, secret: string): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [headerB64, payloadB64, signatureB64] = parts
    
    // Decode payload
    const payloadJson = base64UrlDecode(payloadB64)
    const payload = JSON.parse(payloadJson)
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null
    }

    // Verify signature using Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(`${headerB64}.${payloadB64}`)
    const secretKey = encoder.encode(secret)
    
    // Import the secret key
    const key = await crypto.subtle.importKey(
      'raw',
      secretKey,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    // Decode the signature
    const signature = Uint8Array.from(atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
    
    // Verify the signature
    const isValid = await crypto.subtle.verify('HMAC', key, signature, data)
    
    if (!isValid) {
      return null
    }

    return {
      userId: payload.userId,
      sessionId: payload.sessionId
    }
  } catch (error) {
    console.log('JWT verification error:', error)
    return null
  }
}

export const getSessionFromToken = async (req: NextRequest): Promise<EdgeSessionData | null> => {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value

    if (!sessionToken) {
      console.log('No session token found in cookies')
      return null
    }

    console.log('Found session token, verifying...')
    const payload = await verifyJWT(sessionToken, JWT_SECRET)
    
    if (!payload) {
      console.log('Session verification failed - invalid token')
      return null
    }
    
    console.log('Session verified successfully:', { userId: payload.userId, sessionId: payload.sessionId })
    return { userId: payload.userId, sessionId: payload.sessionId }
  } catch (error) {
    console.log('Session verification failed:', error)
    return null
  }
} 