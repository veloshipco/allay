'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TenantNavProps {
  tenantId: string
}

export function TenantNav({ tenantId }: TenantNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    {
      href: `/${tenantId}`,
      label: 'Dashboard',
      isActive: pathname === `/${tenantId}`
    },
    {
      href: `/${tenantId}/conversations`,
      label: 'Conversations',
      isActive: pathname.startsWith(`/${tenantId}/conversations`)
    },
    {
      href: `/${tenantId}/integrations`,
      label: 'Integrations',
      isActive: pathname.startsWith(`/${tenantId}/integrations`)
    },
    {
      href: `/${tenantId}/settings`,
      label: 'Settings',
      isActive: pathname.startsWith(`/${tenantId}/settings`)
    }
  ]

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        router.push('/login')
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="border-b bg-background">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">Allay</h1>
          <div className="text-sm text-muted-foreground">
            Tenant: {tenantId.slice(0, 8)}...
          </div>
        </div>
        
        <nav className="ml-8 flex items-center space-x-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={item.isActive ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'h-9 px-3',
                  item.isActive && 'bg-primary text-primary-foreground'
                )}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
        
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
} 