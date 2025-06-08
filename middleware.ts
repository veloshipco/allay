import { NextRequest, NextResponse } from 'next/server'
import { getSession, checkTenantAccess, redirectToLogin } from './lib/auth'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  
  // Skip middleware for API routes, static files, and public routes
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/login' ||
    pathname === '/unauthorized'
  ) {
    return NextResponse.next()
  }

  // Extract tenant ID from the URL path
  const pathSegments = pathname.split('/').filter(Boolean)
  const tenantId = pathSegments[0]
  
  if (!tenantId) {
    return NextResponse.next()
  }

  // Check if this is a tenant-specific route (UUID pattern)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(tenantId)) {
    return NextResponse.next()
  }

  // Get user session
  const { user } = await getSession()
  if (!user) {
    return redirectToLogin(req)
  }

  // Check tenant access
  const hasAccess = await checkTenantAccess(user.id, tenantId)
  if (!hasAccess) {
    return new Response('Access denied', { status: 403 })
  }

  // Add tenant ID to headers for downstream use
  const res = NextResponse.next()
  res.headers.set('x-tenant-id', tenantId)
  return res
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