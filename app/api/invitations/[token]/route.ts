import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromToken } from '@/lib/auth-edge'
import { acceptInvitation } from '@/lib/organization'

// GET /api/invitations/[token] - Get invitation details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    
    // For now, we'll just return a simple response
    // In a full implementation, you'd fetch invitation details
    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error fetching invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/invitations/[token]/accept - Accept invitation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const session = await getSessionFromToken(req)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await acceptInvitation(token, session.userId)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      tenantId: result.tenantId 
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 