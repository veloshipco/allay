import { NextResponse } from 'next/server'
import { getSession, invalidateSession } from '@/lib/auth'

export async function POST() {
  try {
    const sessionData = await getSession()
    
    if (sessionData) {
      await invalidateSession(sessionData.sessionId)
    }

    const response = NextResponse.json({
      message: 'Logged out successfully'
    })

    // Clear session cookie
    response.cookies.delete('allay-session')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 