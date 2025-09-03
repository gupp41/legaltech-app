'use client'

import React, { useState } from 'react'
import { useTeam } from '@/lib/contexts/team-context'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { 
  ChevronDown, 
  Users, 
  Plus, 
  Settings,
  Crown,
  User,
  Eye
} from 'lucide-react'
import { CreateTeamDialog } from './create-team-dialog'

interface TeamSelectorProps {
  className?: string
}

export function TeamSelector({ className }: TeamSelectorProps) {
  const { teams, currentTeam, setCurrentTeam, loading } = useTeam()
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3 text-yellow-500" />
      case 'member':
        return <User className="h-3 w-3 text-blue-500" />
      case 'viewer':
        return <Eye className="h-3 w-3 text-gray-500" />
      default:
        return <User className="h-3 w-3 text-gray-500" />
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

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </div>
    )
  }

  if (!currentTeam) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Team</span>
        </Button>
      </div>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`flex items-center space-x-2 ${className}`}
          >
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Users className="h-3 w-3 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{currentTeam.name}</div>
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  {getRoleIcon(currentTeam.role)}
                  <span>{getRoleLabel(currentTeam.role)}</span>
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1.5 text-sm font-medium text-gray-900">
            Switch Team
          </div>
          <DropdownMenuSeparator />
          
          {teams.map((team) => (
            <DropdownMenuItem
              key={team.id}
              onClick={() => setCurrentTeam(team)}
              className="flex items-center space-x-3 p-2"
            >
              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                <Users className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{team.name}</div>
                <div className="text-xs text-gray-500 flex items-center space-x-1">
                  {getRoleIcon(team.role)}
                  <span>{getRoleLabel(team.role)}</span>
                  <span>•</span>
                  <span>{team.memberCount} member{team.memberCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {team.id === currentTeam.id && (
                <div className="h-2 w-2 rounded-full bg-green-500" />
              )}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center space-x-2 p-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Team</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateTeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </>
  )
}
