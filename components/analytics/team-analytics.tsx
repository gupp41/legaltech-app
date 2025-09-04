'use client'

import React from 'react'
import { useAnalytics } from '@/lib/contexts/analytics-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  User,
  Crown,
  Eye,
  FileText,
  Brain,
  TrendingUp,
  Calendar
} from 'lucide-react'

interface TeamAnalyticsProps {
  timeRange: string
}

export function TeamAnalytics({ timeRange }: TeamAnalyticsProps) {
  const { data, loading } = useAnalytics()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.team) {
    return null // Don't show team analytics if user is not in a team
  }

  const { team } = data

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Team Analytics</span>
          <Badge variant="secondary">Team View</Badge>
        </CardTitle>
        <CardDescription>
          Team collaboration metrics and member activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Active Members</div>
            <div className="text-2xl font-bold">{team.periodStats.activeMembers}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Documents Shared</div>
            <div className="text-2xl font-bold">{team.periodStats.documentsShared}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Team Analyses</div>
            <div className="text-2xl font-bold">{team.periodStats.analysesPerformed}</div>
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Team Storage</div>
            <div className="text-2xl font-bold">{formatBytes(team.periodStats.storageUsedBytes)}</div>
          </div>
        </div>

        {/* Member Activity */}
        {team.memberActivity && team.memberActivity.length > 0 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3">Member Activity</h4>
              <div className="space-y-2">
                {team.memberActivity.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="flex items-center space-x-2">
                          {getRoleIcon(member.role)}
                          <span className="text-sm text-muted-foreground">
                            {getRoleLabel(member.role)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <FileText className="h-4 w-4" />
                        <span>{member.documentsShared}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Brain className="h-4 w-4" />
                        <span>{member.analysesPerformed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Team Activity */}
        {(team.recentActivity.documents.length > 0 || team.recentActivity.analyses.length > 0) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Recent Team Activity</h4>
            
            {/* Recent Documents */}
            {team.recentActivity.documents.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Recent Documents</div>
                <div className="space-y-2">
                  {team.recentActivity.documents.slice(0, 3).map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium truncate">
                          {doc.document?.filename || 'Unknown Document'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {doc.access_level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Analyses */}
            {team.recentActivity.analyses.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Recent Analyses</div>
                <div className="space-y-2">
                  {team.recentActivity.analyses.slice(0, 3).map((analysis: any) => (
                    <div key={analysis.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Brain className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">
                          {analysis.analysis_type || 'Analysis'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={analysis.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {analysis.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Team Performance Summary */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Team Productivity</div>
            <div className="text-2xl font-bold">
              {team.periodStats.documentsShared + team.periodStats.analysesPerformed}
            </div>
            <div className="text-xs text-muted-foreground">
              Total activities this period
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Storage Efficiency</div>
            <div className="text-2xl font-bold">
              {formatBytes(team.periodStats.storageUsedBytes)}
            </div>
            <div className="text-xs text-muted-foreground">
              Team storage utilization
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
