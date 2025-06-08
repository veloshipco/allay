import { TenantNav } from '@/components/tenant-nav'

export default async function DashboardLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  
  // Basic UUID validation - full tenant validation happens in middleware and API routes
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidPattern.test(tenantId)) {
    return <div>Invalid tenant ID</div>
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <TenantNav tenantId={tenantId} />
      <main className="flex-1 bg-muted/40 p-6">{children}</main>
    </div>
  )
} 