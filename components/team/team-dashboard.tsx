'use client'

import React, { useState } from 'react'
import { useTeam } from '@/lib/contexts/team-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  UserPlus, 
  FileText, 
  Settings, 
  Crown,
  User,
  Eye,
  Calendar,
  Mail
} from 'lucide-react'
import { TeamMembersList } from './team-members-list'
import { TeamInvitationsList } from './team-invitations-list'
import { TeamDocumentsList } from './team-documents-list'
import { TeamSettingsDialog } from './team-settings-dialog'

interface TeamDashboardProps {
  className?: string
}

export function TeamDashboard({ className }: TeamDashboardProps) {
  const { currentTeam, teamMembers, teamInvitations, teamDocuments, loading } = useTeam()
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!currentTeam) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
        <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Team Selected</h3>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
          Select a team from the dropdown above to view team information and manage members.
        </p>
      </div>
    )
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
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin'
      case 'member':
        return 'Member'
      case 'viewer':
        return 'Viewer'
      default:
        return 'Member'
    }
  }

  const activeMembers = teamMembers.filter(member => member.status === 'active')
  const pendingInvitations = teamInvitations.filter(invitation => !invitation.isExpired)
  const activeDocuments = teamDocuments.filter(doc => !doc.isExpired)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Team Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Active members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvitations.length}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDocuments.length}</div>
            <p className="text-xs text-muted-foreground">
              Active shares
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
            {getRoleIcon(currentTeam.role)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getRoleLabel(currentTeam.role)}</div>
            <p className="text-xs text-muted-foreground">
              Team permissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{currentTeam.name}</span>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  {getRoleIcon(currentTeam.role)}
                  <span>{getRoleLabel(currentTeam.role)}</span>
                </Badge>
              </CardTitle>
              {currentTeam.description && (
                <CardDescription className="mt-2">
                  {currentTeam.description}
                </CardDescription>
              )}
            </div>
            {currentTeam.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowSettingsDialog(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Team Settings
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Created {new Date(currentTeam.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{currentTeam.memberCount} member{currentTeam.memberCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Joined {new Date(currentTeam.joinedAt).toLocaleDateString()}</span>
              </div>
              {currentTeam.billingEmail && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Billing: {currentTeam.billingEmail}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <TeamMembersList />

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && <TeamInvitationsList />}

      {/* Shared Documents */}
      <TeamDocumentsList />
      
      {/* Team Settings Dialog */}
      <TeamSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
      />
    </div>
  )
}
