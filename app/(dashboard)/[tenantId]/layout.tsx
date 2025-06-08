import { TenantNav } from '@/components/tenant-nav'
import { validateTenantAccess } from '@/lib/auth'

export default async function DashboardLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { tenantId: string }
}) {
  await validateTenantAccess(params.tenantId)
  
  return (
    <div className="flex min-h-screen flex-col">
      <TenantNav tenantId={params.tenantId} />
      <main className="flex-1 bg-muted/40 p-6">{children}</main>
    </div>
  )
} 