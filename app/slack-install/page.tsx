'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageSquare, Loader2, Slack } from 'lucide-react'

export default function SlackInstallPage() {
  const [workspaceName, setWorkspaceName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check if coming back from Slack OAuth
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  useEffect(() => {
    if (code && state) {
      // Handle OAuth callback - redirect to tenant dashboard
      router.push(`/${state}?code=${code}`)
    }
  }, [code, state, router])

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Step 1: Create user account
      const registerResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: adminEmail, 
          password, 
          firstName: 'Admin', 
          lastName: 'User'
        })
      })

      if (!registerResponse.ok) {
        const data = await registerResponse.json()
        throw new Error(data.error || 'Registration failed')
      }

      // Step 2: Login
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password })
      })

      if (!loginResponse.ok) {
        throw new Error('Login failed')
      }

      // Step 3: Create tenant
      const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      const tenantResponse = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: workspaceName, slug })
      })

      if (!tenantResponse.ok) {
        const data = await tenantResponse.json()
        throw new Error(data.error || 'Workspace creation failed')
      }

      const tenantData = await tenantResponse.json()
      
      // Step 4: Redirect to Slack OAuth with tenant ID as state
      const slackAuthUrl = `/api/${tenantData.tenant.id}/slack/install`
      window.location.href = slackAuthUrl
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <MessageSquare className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Install Allay</h1>
          <p className="text-gray-600 mt-2">
            Connect your Slack workspace to start managing conversations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Setup Your Workspace</CardTitle>
            <CardDescription>
              Create an admin account and connect your Slack workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInstall} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  placeholder="My Company"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  placeholder="admin@company.com"
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
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li>1. We&apos;ll create your workspace account</li>
                  <li>2. You&apos;ll be redirected to Slack for authorization</li>
                  <li>3. Start receiving and managing conversations!</li>
                </ol>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Slack className="mr-2 h-4 w-4" />
                    Continue to Slack
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 