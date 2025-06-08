import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromToken } from './lib/auth-edge'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Define public routes that should never be processed as tenant routes
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/unauthorized'
  ]

  // Skip middleware for specific routes and patterns
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    publicRoutes.includes(pathname)
  ) {
    return NextResponse.next()
  }

  // Extract potential tenant ID from the URL path
  const pathSegments = pathname.split('/').filter(Boolean)
  const potentialTenantId = pathSegments[0]
  
  if (!potentialTenantId) {
    return NextResponse.next()
  }

  // Strict UUID validation for tenant IDs
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  
  // If the first segment is not a valid UUID, it's not a tenant route
  if (!uuidPattern.test(potentialTenantId)) {
    console.log(`Not a tenant route - invalid UUID format: ${potentialTenantId}`)
    return NextResponse.redirect(new URL('/', req.url))
  }

  // At this point, we have a valid UUID, so this is a tenant route
  const tenantId = potentialTenantId

  // Check authentication for tenant routes
  const sessionData = await getSessionFromToken(req)
  if (!sessionData) {
    console.log(`No session found for tenant route: ${tenantId}`)
    console.log('Cookies:', req.cookies.getAll())
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }

  console.log(`Session found for tenant route: ${tenantId}, user: ${sessionData.userId}`)
  
  // Add tenant and user info to headers
  const response = NextResponse.next()
  response.headers.set('x-tenant-id', tenantId)
  response.headers.set('x-user-id', sessionData.userId)
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 