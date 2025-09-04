'use client'

import React from 'react'
import { useAnalytics } from '@/lib/contexts/analytics-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BarChart3, 
  TrendingUp,
  FileText,
  Brain
} from 'lucide-react'

interface UsageTrendsChartProps {
  timeRange: string
}

export function UsageTrendsChart({ timeRange }: UsageTrendsChartProps) {
  const { data, loading } = useAnalytics()

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data || !data.trends || data.trends.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No trend data available for the selected period
      </div>
    )
  }

  const trends = data.trends
  const maxValue = Math.max(
    ...trends.map(t => Math.max(t.documents, t.analyses))
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getBarHeight = (value: number) => {
    return maxValue > 0 ? (value / maxValue) * 100 : 0
  }

  return (
    <div className="space-y-4">
      {/* Chart Legend */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className="text-sm text-muted-foreground">Documents</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-sm text-muted-foreground">Analyses</span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-48 flex flex-col justify-between text-xs text-muted-foreground">
          <span>{maxValue}</span>
          <span>{Math.round(maxValue * 0.75)}</span>
          <span>{Math.round(maxValue * 0.5)}</span>
          <span>{Math.round(maxValue * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart */}
        <div className="ml-8 h-64 flex items-end space-x-0.5 overflow-x-auto">
          {trends.map((trend, index) => (
            <div key={trend.date} className="flex-shrink-0 w-8 flex flex-col items-center space-y-1 group">
              {/* Bars Container */}
              <div className="w-full flex items-end space-x-0.5 h-48 relative">
                {/* Documents Bar */}
                <div 
                  className="bg-blue-500 rounded-t-sm flex-1 min-h-[2px] hover:bg-blue-600 transition-colors cursor-pointer relative group/bar"
                  style={{ height: `${getBarHeight(trend.documents)}%` }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {trend.documents} documents
                  </div>
                </div>
                {/* Analyses Bar */}
                <div 
                  className="bg-green-500 rounded-t-sm flex-1 min-h-[2px] hover:bg-green-600 transition-colors cursor-pointer relative group/bar"
                  style={{ height: `${getBarHeight(trend.analyses)}%` }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {trend.analyses} analyses
                  </div>
                </div>
              </div>
              
              {/* Date Label */}
              <div className="text-xs text-muted-foreground transform -rotate-45 origin-left whitespace-nowrap">
                {formatDate(trend.date)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <div>
            <div className="text-sm font-medium">
              {trends.reduce((sum, t) => sum + t.documents, 0)} Total Documents
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(trends.reduce((sum, t) => sum + t.documents, 0) / trends.length * 10) / 10} avg/day
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Brain className="h-4 w-4 text-green-500" />
          <div>
            <div className="text-sm font-medium">
              {trends.reduce((sum, t) => sum + t.analyses, 0)} Total Analyses
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(trends.reduce((sum, t) => sum + t.analyses, 0) / trends.length * 10) / 10} avg/day
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
