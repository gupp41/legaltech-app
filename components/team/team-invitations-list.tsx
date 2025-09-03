'use client'

import React, { useState } from 'react'
import { useTeam } from '@/lib/contexts/team-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  Clock, 
  Crown,
  User,
  Eye,
  Calendar,
  X,
  RefreshCw
} from 'lucide-react'

export function TeamInvitationsList() {
  const { currentTeam, teamInvitations, revokeInvitation, loading } = useTeam()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default' as const
      case 'member':
        return 'secondary' as const
      case 'viewer':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!currentTeam) return

    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return
    }

    setActionLoading(invitationId)
    try {
      await revokeInvitation(currentTeam.id, invitationId)
    } catch (error) {
      console.error('Error revoking invitation:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const canManageInvitations = currentTeam?.role === 'admin'
  const pendingInvitations = teamInvitations.filter(invitation => !invitation.isExpired)
  const expiredInvitations = teamInvitations.filter(invitation => invitation.isExpired)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>Pending Invitations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (pendingInvitations.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>Pending Invitations</span>
            </CardTitle>
            <CardDescription>
              {pendingInvitations.length} invitation{pendingInvitations.length !== 1 ? 's' : ''} awaiting response
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-orange-500 flex items-center justify-center">
                <Mail className="h-5 w-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {invitation.email}
                  </h4>
                  <Badge variant={getRoleBadgeVariant(invitation.role)} className="flex items-center space-x-1">
                    {getRoleIcon(invitation.role)}
                    <span>{getRoleLabel(invitation.role)}</span>
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>Invited {new Date(invitation.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>Expires {new Date(invitation.expiresAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span>•</span>
                    <span>By {invitation.invitedBy.fullName || invitation.invitedBy.email}</span>
                  </div>
                </div>
              </div>

              {canManageInvitations && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeInvitation(invitation.id)}
                  disabled={actionLoading === invitation.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {actionLoading === invitation.id ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        {expiredInvitations.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Expired Invitations</h4>
              <Badge variant="outline" className="text-xs">
                {expiredInvitations.length} expired
              </Badge>
            </div>
            <div className="space-y-2">
              {expiredInvitations.slice(0, 3).map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center space-x-3 p-2 border rounded-lg bg-gray-50"
                >
                  <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 truncate">
                        {invitation.email}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {getRoleLabel(invitation.role)}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      Expired {new Date(invitation.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
              {expiredInvitations.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-2">
                  +{expiredInvitations.length - 3} more expired invitations
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
