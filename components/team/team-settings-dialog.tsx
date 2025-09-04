'use client'

import React, { useState } from 'react'
import { useTeam } from '@/lib/contexts/team-context'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings, 
  Save, 
  Trash2, 
  AlertTriangle,
  Loader2
} from 'lucide-react'

interface TeamSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeamSettingsDialog({ open, onOpenChange }: TeamSettingsDialogProps) {
  const { currentTeam, updateTeam, deleteTeam } = useTeam()
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    billingEmail: ''
  })

  // Initialize form data when dialog opens
  React.useEffect(() => {
    if (open && currentTeam) {
      setFormData({
        name: currentTeam.name || '',
        description: currentTeam.description || '',
        billingEmail: currentTeam.billingEmail || ''
      })
    }
  }, [open, currentTeam])

  const handleSave = async () => {
    if (!currentTeam) return

    setLoading(true)
    try {
      await updateTeam(currentTeam.id, formData)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating team:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentTeam) return

    setDeleteLoading(true)
    try {
      await deleteTeam(currentTeam.id)
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting team:', error)
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!currentTeam) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Team Settings</span>
          </DialogTitle>
          <DialogDescription>
            Manage your team's information and settings. Only team admins can modify these settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter team name"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team-description">Description (Optional)</Label>
              <Textarea
                id="team-description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter team description"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing-email">Billing Email (Optional)</Label>
              <Input
                id="billing-email"
                type="email"
                value={formData.billingEmail}
                onChange={(e) => handleInputChange('billingEmail', e.target.value)}
                placeholder="Enter billing email"
                disabled={loading}
              />
            </div>
          </div>

          {/* Danger Zone */}
          <div className="space-y-4">
            <div className="h-px bg-gray-200 dark:bg-gray-700" />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400">Danger Zone</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Once you delete a team, there is no going back. Please be certain.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={loading || deleteLoading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Team
              </Button>
            ) : (
              <div className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Are you sure you want to delete this team? This action cannot be undone.
                    All team members will be removed and all shared documents will be unshared.
                  </AlertDescription>
                </Alert>
                <div className="flex space-x-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Yes, Delete Team
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || deleteLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || deleteLoading || !formData.name.trim()}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
