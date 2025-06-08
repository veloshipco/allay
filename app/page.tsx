import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Users, Zap, ArrowRight } from 'lucide-react'
import { AuthRedirect } from '@/components/auth-redirect'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <AuthRedirect />
      
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Allay</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">
          Multi-tenant Slack Integration Platform
        </Badge>
        <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Connect Your Team&apos;s
          <span className="text-blue-600"> Slack Workspace</span>
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Seamlessly integrate multiple Slack workspaces with our powerful multi-tenant platform. 
          Manage conversations, events, and team interactions all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/register">
            <Button size="lg" className="px-8">
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="px-8">
              Sign In to Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <MessageSquare className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Multi-Tenant Architecture</CardTitle>
              <CardDescription>
                Separate workspaces for different teams and organizations with complete data isolation.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Slack Integration</CardTitle>
              <CardDescription>
                Full OAuth integration with Slack workspaces, real-time events, and message processing.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Zap className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Real-time Events</CardTitle>
              <CardDescription>
                Process Slack events in real-time with secure webhook handling and event processing.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">
            Get Started in 3 Simple Steps
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Setting up your Slack integration is quick and easy
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600">1</span>
            </div>
            <h4 className="text-xl font-semibold mb-2">Create Account</h4>
            <p className="text-gray-600">Sign up and create your tenant workspace</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-green-600">2</span>
            </div>
            <h4 className="text-xl font-semibold mb-2">Install Slack App</h4>
            <p className="text-gray-600">Connect your Slack workspace with OAuth</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-purple-600">3</span>
            </div>
            <h4 className="text-xl font-semibold mb-2">Start Managing</h4>
            <p className="text-gray-600">View conversations and manage your team</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Connect Your Team?</h3>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of teams using Allay to manage their Slack integrations
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="px-8">
              Get Started Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 Allay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
