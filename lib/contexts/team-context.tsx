'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

// Types
interface Team {
  id: string
  name: string
  description?: string
  role: 'admin' | 'member' | 'viewer'
  memberCount: number
  createdAt: string
  updatedAt: string
  settings?: any
  billingEmail?: string
  subscriptionId?: string
  joinedAt: string
}

interface TeamMember {
  id: string
  role: 'admin' | 'member' | 'viewer'
  status: 'pending' | 'active' | 'suspended'
  invitedAt: string
  joinedAt?: string
  user: {
    id: string
    fullName?: string
    email: string
    companyName?: string
  }
}

interface TeamInvitation {
  id: string
  email: string
  role: 'admin' | 'member' | 'viewer'
  invitedBy: {
    fullName?: string
    email: string
  }
  expiresAt: string
  createdAt: string
  isExpired: boolean
}

interface TeamDocument {
  shareId: string
  document: {
    id: string
    filename: string
    fileType: string
    fileSize: number
    createdAt: string
    updatedAt: string
    owner: {
      fullName?: string
      email: string
    }
  }
  accessLevel: 'view' | 'comment' | 'edit'
  expiresAt?: string
  sharedBy: {
    fullName?: string
    email: string
  }
  sharedAt: string
  isExpired: boolean
}

interface TeamContextType {
  // State
  teams: Team[]
  currentTeam: Team | null
  teamMembers: TeamMember[]
  teamInvitations: TeamInvitation[]
  teamDocuments: TeamDocument[]
  loading: boolean
  error: string | null

  // Actions
  setCurrentTeam: (team: Team | null) => void
  refreshTeams: () => Promise<void>
  refreshTeamMembers: () => Promise<void>
  refreshTeamInvitations: () => Promise<void>
  refreshTeamDocuments: () => Promise<void>
  createTeam: (name: string, description?: string) => Promise<Team | null>
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>
  deleteTeam: (teamId: string) => Promise<boolean>
  addTeamMember: (teamId: string, userId: string, role: 'admin' | 'member' | 'viewer') => Promise<boolean>
  updateMemberRole: (teamId: string, memberId: string, role: 'admin' | 'member' | 'viewer') => Promise<boolean>
  removeTeamMember: (teamId: string, memberId: string) => Promise<boolean>
  sendInvitation: (teamId: string, email: string, role: 'admin' | 'member' | 'viewer') => Promise<boolean>
  revokeInvitation: (teamId: string, invitationId: string) => Promise<boolean>
  shareDocument: (teamId: string, documentId: string, accessLevel: 'view' | 'comment' | 'edit', expiresAt?: string) => Promise<boolean>
  updateDocumentShare: (teamId: string, shareId: string, accessLevel: 'view' | 'comment' | 'edit', expiresAt?: string) => Promise<boolean>
  removeDocumentShare: (teamId: string, shareId: string) => Promise<boolean>
}

const TeamContext = createContext<TeamContextType | undefined>(undefined)

interface TeamProviderProps {
  children: ReactNode
}

export function TeamProvider({ children }: TeamProviderProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamInvitations, setTeamInvitations] = useState<TeamInvitation[]>([])
  const [teamDocuments, setTeamDocuments] = useState<TeamDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch user's teams
  const refreshTeams = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/teams', {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }

      const data = await response.json()
      setTeams(data.teams || [])

      // Set current team if not already set and teams exist
      if (!currentTeam && data.teams && data.teams.length > 0) {
        setCurrentTeam(data.teams[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch teams')
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch team members
  const refreshTeamMembers = async () => {
    if (!currentTeam) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${currentTeam.id}/members`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch team members')
      }

      const data = await response.json()
      setTeamMembers(data.members || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team members')
      console.error('Error fetching team members:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch team invitations
  const refreshTeamInvitations = async () => {
    if (!currentTeam) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${currentTeam.id}/invitations`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch team invitations')
      }

      const data = await response.json()
      setTeamInvitations(data.invitations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team invitations')
      console.error('Error fetching team invitations:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch team documents
  const refreshTeamDocuments = async () => {
    if (!currentTeam) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${currentTeam.id}/documents`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch team documents')
      }

      const data = await response.json()
      setTeamDocuments(data.documents || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch team documents')
      console.error('Error fetching team documents:', err)
    } finally {
      setLoading(false)
    }
  }

  // Create new team
  const createTeam = async (name: string, description?: string): Promise<Team | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ name, description })
      })

      if (!response.ok) {
        throw new Error('Failed to create team')
      }

      const data = await response.json()
      const newTeam = data.team

      // Add to teams list
      setTeams(prev => [...prev, newTeam])
      
      // Set as current team
      setCurrentTeam(newTeam)

      return newTeam
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
      console.error('Error creating team:', err)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Update team
  const updateTeam = async (teamId: string, updates: Partial<Team>): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update team')
      }

      const data = await response.json()
      const updatedTeam = data.team

      // Update teams list
      setTeams(prev => prev.map(team => 
        team.id === teamId ? { ...team, ...updatedTeam } : team
      ))

      // Update current team if it's the one being updated
      if (currentTeam?.id === teamId) {
        setCurrentTeam({ ...currentTeam, ...updatedTeam })
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update team')
      console.error('Error updating team:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Delete team
  const deleteTeam = async (teamId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to delete team')
      }

      // Remove from teams list
      setTeams(prev => prev.filter(team => team.id !== teamId))

      // Clear current team if it's the one being deleted
      if (currentTeam?.id === teamId) {
        setCurrentTeam(teams.find(team => team.id !== teamId) || null)
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team')
      console.error('Error deleting team:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Add team member
  const addTeamMember = async (teamId: string, userId: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId, role })
      })

      if (!response.ok) {
        throw new Error('Failed to add team member')
      }

      // Refresh team members
      await refreshTeamMembers()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add team member')
      console.error('Error adding team member:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Update member role
  const updateMemberRole = async (teamId: string, memberId: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ role })
      })

      if (!response.ok) {
        throw new Error('Failed to update member role')
      }

      // Refresh team members
      await refreshTeamMembers()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role')
      console.error('Error updating member role:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Remove team member
  const removeTeamMember = async (teamId: string, memberId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to remove team member')
      }

      // Refresh team members
      await refreshTeamMembers()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove team member')
      console.error('Error removing team member:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Send invitation
  const sendInvitation = async (teamId: string, email: string, role: 'admin' | 'member' | 'viewer'): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email, role })
      })

      if (!response.ok) {
        throw new Error('Failed to send invitation')
      }

      // Refresh team invitations
      await refreshTeamInvitations()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
      console.error('Error sending invitation:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Revoke invitation
  const revokeInvitation = async (teamId: string, invitationId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to revoke invitation')
      }

      // Refresh team invitations
      await refreshTeamInvitations()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation')
      console.error('Error revoking invitation:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Share document
  const shareDocument = async (teamId: string, documentId: string, accessLevel: 'view' | 'comment' | 'edit', expiresAt?: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ documentId, accessLevel, expiresAt })
      })

      if (!response.ok) {
        throw new Error('Failed to share document')
      }

      // Refresh team documents
      await refreshTeamDocuments()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share document')
      console.error('Error sharing document:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Update document share
  const updateDocumentShare = async (teamId: string, shareId: string, accessLevel: 'view' | 'comment' | 'edit', expiresAt?: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}/documents/${shareId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ accessLevel, expiresAt })
      })

      if (!response.ok) {
        throw new Error('Failed to update document share')
      }

      // Refresh team documents
      await refreshTeamDocuments()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update document share')
      console.error('Error updating document share:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Remove document share
  const removeDocumentShare = async (teamId: string, shareId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/teams/${teamId}/documents/${shareId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to remove document share')
      }

      // Refresh team documents
      await refreshTeamDocuments()

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove document share')
      console.error('Error removing document share:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Load teams on mount
  useEffect(() => {
    refreshTeams()
  }, [])

  // Load team data when current team changes
  useEffect(() => {
    if (currentTeam) {
      refreshTeamMembers()
      refreshTeamInvitations()
      refreshTeamDocuments()
    }
  }, [currentTeam])

  const value: TeamContextType = {
    // State
    teams,
    currentTeam,
    teamMembers,
    teamInvitations,
    teamDocuments,
    loading,
    error,

    // Actions
    setCurrentTeam,
    refreshTeams,
    refreshTeamMembers,
    refreshTeamInvitations,
    refreshTeamDocuments,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    updateMemberRole,
    removeTeamMember,
    sendInvitation,
    revokeInvitation,
    shareDocument,
    updateDocumentShare,
    removeDocumentShare
  }

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  const context = useContext(TeamContext)
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider')
  }
  return context
}
