'use client'

import React, { useState } from 'react'
import { useTeam } from '@/lib/contexts/team-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, UserPlus, Crown, User, Eye } from 'lucide-react'

interface InviteMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { currentTeam, sendInvitation, loading } = useTeam()
  const [formData, setFormData] = useState({
    email: '',
    role: 'member' as 'admin' | 'member' | 'viewer'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.email.trim() || !currentTeam) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const success = await sendInvitation(currentTeam.id, formData.email.trim(), formData.role)
      
      if (success) {
        // Reset form
        setFormData({ email: '', role: 'member' })
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error sending invitation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open)
      if (!open) {
        // Reset form when closing
        setFormData({ email: '', role: 'member' })
      }
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'member':
        return <User className="h-4 w-4 text-blue-500" />
      case 'viewer':
        return <Eye className="h-4 w-4 text-gray-500" />
      default:
        return <User className="h-4 w-4 text-blue-500" />
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Full access to team settings, members, and documents'
      case 'member':
        return 'Can view and edit shared documents, invite members'
      case 'viewer':
        return 'Can only view shared documents'
      default:
        return 'Can view and edit shared documents, invite members'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Invite Team Member</span>
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join {currentTeam?.name || 'your team'}.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="colleague@company.com"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'admin' | 'member' | 'viewer') => 
                  setFormData(prev => ({ ...prev, role: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon('admin')}
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Full access</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="member">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon('member')}
                      <div>
                        <div className="font-medium">Member</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Edit access</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon('viewer')}
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">View only</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getRoleDescription(formData.role)}
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.email.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
