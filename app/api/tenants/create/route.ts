import { NextRequest, NextResponse } from 'next/server'
import { getSession, addUserToTenant } from '@/lib/auth'
import { createTenant } from '@/lib/tenant'

export async function POST(req: NextRequest) {
  try {
    const sessionData = await getSession()
    
    if (!sessionData) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { name, slug } = await req.json()

    // Validate input
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Validate slug format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      )
    }

    // Create tenant
    const { tenant, error } = await createTenant({ name, slug })
    
    if (error || !tenant) {
      if (error && typeof error === 'object' && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('duplicate key')) {
        return NextResponse.json(
          { error: 'A tenant with this slug already exists' },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create tenant' },
        { status: 500 }
      )
    }

    // Add current user to the tenant
    const userAdded = await addUserToTenant(sessionData.user.id, tenant.id)
    
    if (!userAdded) {
      return NextResponse.json(
        { error: 'Failed to associate user with tenant' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Tenant created successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Tenant creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 