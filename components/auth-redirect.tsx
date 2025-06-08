'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function AuthRedirect() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        // Check if user is authenticated by trying to get their tenants
        const response = await fetch('/api/auth/user-tenants')
        if (response.ok) {
          const data = await response.json()
          if (data.tenants && data.tenants.length > 0) {
            // User is authenticated and has tenants, redirect to first tenant
            const firstTenant = data.tenants[0]
            router.push(`/${firstTenant.id}`)
            return
          }
        }
        // User is not authenticated or has no tenants, stay on home page
        setChecking(false)
      } catch {
        // Error checking auth, stay on home page
        console.log('Auth check failed, staying on home page')
        setChecking(false)
      }
    }

    checkAuthAndRedirect()
  }, [router])

  // Don't render anything while checking auth
  if (checking) {
    return null
  }

  return null
} 