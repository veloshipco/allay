import { NextResponse } from 'next/server'
import { getSession, getUserTenants } from '@/lib/auth'

export async function GET() {
  try {
    const sessionData = await getSession()
    
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { tenants, error } = await getUserTenants(sessionData.user.id)
    
    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      tenants: tenants.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug
      }))
    })
  } catch (error) {
    console.error('Error fetching user tenants:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 