'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageSquare, Loader2, CheckCircle, XCircle } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Validate slug format
  const isValidSlug = (slug: string) => {
    return /^[a-zA-Z0-9_-]+$/.test(slug) && slug.length >= 3
  }

  const handleSlugChange = (value: string) => {
    // Convert to lowercase and replace spaces with hyphens for better UX
    const formattedSlug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9_-]/g, '')
    setTenantSlug(formattedSlug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validate slug before submitting
    if (!isValidSlug(tenantSlug)) {
      setError('Workspace URL must be at least 3 characters and contain only letters, numbers, hyphens, and underscores')
      setLoading(false)
      return
    }

    try {
      // First, register the user
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName })
      })

      if (!registerResponse.ok) {
        const data = await registerResponse.json()
        throw new Error(data.error || 'Registration failed')
      }

      // Login the user
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (!loginResponse.ok) {
        throw new Error('Login failed after registration')
      }

      // Create the tenant
      const tenantResponse = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tenantName, slug: tenantSlug })
      })

      if (!tenantResponse.ok) {
        const data = await tenantResponse.json()
        throw new Error(data.error || 'Tenant creation failed')
      }

      const tenantData = await tenantResponse.json()
      
      // Redirect to the tenant integrations page for Slack setup
      router.push(`/${tenantData.tenant.id}/integrations`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700">
            <MessageSquare className="h-8 w-8" />
            <span className="text-2xl font-bold">Allay</span>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>
              Get started with your multi-tenant Slack integration platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="John"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="john@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a password"
                  minLength={8}
                />
                <p className="text-xs text-gray-500">
                  Password must be at least 8 characters
                </p>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium text-gray-900 mb-4">Create Your Workspace</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="tenantName">Workspace Name</Label>
                  <Input
                    id="tenantName"
                    type="text"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    required
                    placeholder="My Company"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenantSlug" className="flex items-center space-x-2">
                    <span>Workspace Identifier</span>
                    {tenantSlug && (
                      isValidSlug(tenantSlug) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )
                    )}
                  </Label>
                  <Input
                    id="tenantSlug"
                    type="text"
                    value={tenantSlug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    placeholder="acme-corp"
                    minLength={3}
                  />
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">
                      Your workspace will be accessible at: <span className="font-mono text-blue-600">/{tenantSlug || 'your-identifier'}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Use your company name, team name, or any unique identifier (e.g., &quot;acme-corp&quot;, &quot;marketing-team&quot;)
                    </p>
                    {tenantSlug && !isValidSlug(tenantSlug) && (
                      <p className="text-xs text-red-500">
                        Must be at least 3 characters and contain only letters, numbers, hyphens, and underscores
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                <p className="text-sm text-blue-700">
                  After creating your workspace, you&apos;ll be taken to set up your Slack integration to start managing conversations.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || (tenantSlug ? !isValidSlug(tenantSlug) : false)}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Workspace'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  )
} 