'use client'

import React from 'react'
import { useAnalytics } from '@/lib/contexts/analytics-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Brain, 
  HardDrive, 
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'

interface AnalyticsOverviewProps {
  timeRange: string
}

export function AnalyticsOverview({ timeRange }: AnalyticsOverviewProps) {
  const { data, loading } = useAnalytics()

  if (loading) {
    return (
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
    )
  }

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500 dark:text-gray-400">
              No analytics data available
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { user, team } = data

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%'
    const percentage = ((current - previous) / previous) * 100
    return `${percentage >= 0 ? '+' : ''}${Math.round(percentage)}%`
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Documents Uploaded */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Documents Uploaded</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{user.periodStats.documentsUploaded}</div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            {getTrendIcon(user.periodStats.documentsUploaded, 0)}
            <span>This period</span>
          </div>
        </CardContent>
      </Card>

      {/* Analyses Performed */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Analyses Performed</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{user.periodStats.analysesPerformed}</div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <span className="text-green-600 dark:text-green-400">
              {user.periodStats.analysisSuccessRate}% success rate
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Storage Used */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
 <CardContent>
          <div className="text-2xl font-bold">{formatBytes(user.periodStats.storageUsedBytes)}</div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <span>This period</span>
          </div>
        </CardContent>
      </Card>

      {/* Text Extractions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Text Extractions</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{user.periodStats.textExtractions}</div>
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <span>This period</span>
          </div>
        </CardContent>
      </Card>

      {/* Team Analytics (if available) */}
      {team && (
        <>
          <Card className="md:col-span-2 lg:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>Team Analytics</span>
                <Badge variant="secondary">Team View</Badge>
              </CardTitle>
              <CardDescription>
                Overview of team collaboration and shared resources
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
