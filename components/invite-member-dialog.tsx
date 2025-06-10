'use client'

import { useState } from 'react'
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OrganizationRole } from '@/lib/organization/types'
import { Loader2 } from 'lucide-react'

interface InviteMemberDialogProps {
  tenantId: string
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function InviteMemberDialog({ tenantId, open, onClose, onSuccess }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>(OrganizationRole.MEMBER)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/${tenantId}/organization/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          proposedRole: role,
          message: message.trim() || undefined,
          expiresInDays: 7
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      // Reset form
      setEmail('')
      setRole(OrganizationRole.MEMBER)
      setMessage('')
      
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setEmail('')
      setRole(OrganizationRole.MEMBER)
      setMessage('')
      setError(null)
      onClose()
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Invite Member</AlertDialogTitle>
          <AlertDialogDescription>
            Send an invitation to join your organization. They&apos;ll receive an email with instructions to accept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as OrganizationRole)} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={OrganizationRole.MEMBER}>Member</SelectItem>
                <SelectItem value={OrganizationRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={OrganizationRole.OWNER}>Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
} 