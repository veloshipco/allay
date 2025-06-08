'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MessageSquare, Home, MessageCircle, Settings, Zap, LogOut, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

interface TenantNavProps {
  tenantId: string
}

interface TenantInfo {
  name: string
  slug: string
  isSlackConnected: boolean
}

export function TenantNav({ tenantId }: TenantNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)

  useEffect(() => {
    // Fetch tenant info for display
    const fetchTenantInfo = async () => {
      try {
        const response = await fetch(`/api/tenants/${tenantId}/info`)
        if (response.ok) {
          const data = await response.json()
          setTenantInfo(data)
        }
      } catch (error) {
        console.error('Error fetching tenant info:', error)
      }
    }

    fetchTenantInfo()
  }, [tenantId])

  const navItems = [
    {
      href: `/${tenantId}`,
      label: 'Dashboard',
      icon: Home,
      isActive: pathname === `/${tenantId}`
    },
    {
      href: `/${tenantId}/conversations`,
      label: 'Conversations',
      icon: MessageCircle,
      isActive: pathname.startsWith(`/${tenantId}/conversations`)
    },
    {
      href: `/${tenantId}/users`,
      label: 'Users',
      icon: Users,
      isActive: pathname.startsWith(`/${tenantId}/users`)
    },
    {
      href: `/${tenantId}/integrations`,
      label: 'Integrations',
      icon: Zap,
      isActive: pathname.startsWith(`/${tenantId}/integrations`)
    },
    {
      href: `/${tenantId}/settings`,
      label: 'Settings',
      icon: Settings,
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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">Allay</span>
          </Link>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium">
              {tenantInfo?.name || 'Loading...'}
            </div>
            {tenantInfo?.isSlackConnected && (
              <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                Connected
              </Badge>
            )}
          </div>
        </div>
        
        <nav className="ml-8 flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.isActive ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-9 px-3 flex items-center space-x-2',
                    item.isActive && 'bg-primary text-primary-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>
        
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
} 