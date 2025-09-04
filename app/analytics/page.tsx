'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart3, 
  FileText, 
  Brain, 
  TrendingUp, 
  Users, 
  Calendar,
  Download,
  RefreshCw,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { AnalyticsProvider } from '@/lib/contexts/analytics-context'
import { AnalyticsOverview } from '@/components/analytics/analytics-overview'
import { UsageTrendsChart } from '@/components/analytics/usage-trends-chart'
import { DocumentInsights } from '@/components/analytics/document-insights'
import { AnalysisInsights } from '@/components/analytics/analysis-insights'
import { TeamAnalytics } from '@/components/analytics/team-analytics'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(true)

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  return (
    <AnalyticsProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeRangeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Overview Cards */}
            <AnalyticsOverview timeRange={timeRange} />

            {/* Usage Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Usage Trends</span>
                </CardTitle>
                <CardDescription>
                  Track your document uploads and analysis activity over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UsageTrendsChart timeRange={timeRange} />
              </CardContent>
            </Card>

            {/* Document Insights */}
            <DocumentInsights timeRange={timeRange} />

            {/* Analysis Insights */}
            <AnalysisInsights timeRange={timeRange} />

            {/* Team Analytics (if user is in a team) */}
            <TeamAnalytics timeRange={timeRange} />
          </div>
        </div>
      </div>
    </AnalyticsProvider>
  )
}
