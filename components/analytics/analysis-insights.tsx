'use client'

import React from 'react'
import { useAnalytics } from '@/lib/contexts/analytics-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Clock, 
  CheckCircle,
  XCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react'

interface AnalysisInsightsProps {
  timeRange: string
}

export function AnalysisInsights({ timeRange }: AnalysisInsightsProps) {
  const { data, loading } = useAnalytics()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.analyses) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analysis Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No analysis data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const { analyses } = data

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`
    return `${Math.round(seconds / 3600)}h`
  }

  const getAnalysisTypeIcon = (type: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'contract': <Brain className="h-4 w-4 text-blue-500" />,
      'risk': <TrendingUp className="h-4 w-4 text-red-500" />,
      'compliance': <CheckCircle className="h-4 w-4 text-green-500" />,
      'summary': <BarChart3 className="h-4 w-4 text-purple-500" />,
      'default': <Brain className="h-4 w-4 text-gray-500" />
    }
    return iconMap[type] || iconMap['default']
  }

  const getAnalysisTypeLabel = (type: string) => {
    const labelMap: { [key: string]: string } = {
      'contract': 'Contract Analysis',
      'risk': 'Risk Assessment',
      'compliance': 'Compliance Check',
      'summary': 'Document Summary',
      'default': type
    }
    return labelMap[type] || type
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Analysis Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Analysis Statistics</span>
          </CardTitle>
          <CardDescription>
            Overview of your AI analysis performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Analyses</div>
              <div className="text-2xl font-bold">{analyses.totalAnalyses}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Success Rate</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analyses.successRate}%
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Avg Processing Time</div>
              <div className="text-2xl font-bold">{formatTime(analyses.averageProcessingTime)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Analysis Types</div>
              <div className="text-2xl font-bold">{Object.keys(analyses.analysisTypeBreakdown).length}</div>
            </div>
          </div>

          {/* Success Rate Visualization */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Success Rate</span>
              <span>{analyses.successRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${analyses.successRate}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Analysis Types</span>
          </CardTitle>
          <CardDescription>
            Breakdown of analysis types performed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(analyses.analysisTypeBreakdown).length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              No analysis type data available
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(analyses.analysisTypeBreakdown)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([type, count]) => {
                  const percentage = analyses.totalAnalyses > 0 
                    ? Math.round((count as number / analyses.totalAnalyses) * 100)
                    : 0
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getAnalysisTypeIcon(type)}
                        <span className="text-sm font-medium">
                          {getAnalysisTypeLabel(type)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Most Common Analysis Type */}
          {analyses.mostCommonAnalysisType && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Most Common:</span>
                <Badge variant="secondary">
                  {getAnalysisTypeLabel(analyses.mostCommonAnalysisType)}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Performance Insights</span>
          </CardTitle>
          <CardDescription>
            Analysis performance and efficiency metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Processing Time */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Average Processing Time</span>
              </div>
              <div className="text-2xl font-bold">{formatTime(analyses.averageProcessingTime)}</div>
              <div className="text-xs text-muted-foreground">
                Per analysis
              </div>
            </div>

            {/* Success Rate */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Success Rate</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {analyses.successRate}%
              </div>
              <div className="text-xs text-muted-foreground">
                Completed successfully
              </div>
            </div>

            {/* Total Volume */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Total Analyses</span>
              </div>
              <div className="text-2xl font-bold">{analyses.totalAnalyses}</div>
              <div className="text-xs text-muted-foreground">
                This period
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
