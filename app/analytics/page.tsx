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
  ArrowLeft,
  Menu,
  X,
  LogOut,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { AnalyticsProvider, useAnalytics } from '@/lib/contexts/analytics-context'
import { AnalyticsOverview } from '@/components/analytics/analytics-overview'
import { UsageTrendsChart } from '@/components/analytics/usage-trends-chart'
import { DocumentInsights } from '@/components/analytics/document-insights'
import { AnalysisInsights } from '@/components/analytics/analysis-insights'
import { TeamAnalytics } from '@/components/analytics/team-analytics'
import { ThemeToggle } from '@/components/theme-toggle'

function AnalyticsContent() {
  const { timeRange, setTimeRange, refreshData } = useAnalytics()
  const [hamburgerMenuOpen, setHamburgerMenuOpen] = useState(false)

  const timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  const handleExportReport = () => {
    // TODO: Implement export functionality
    console.log('Export report functionality to be implemented')
    alert('Export functionality will be implemented soon!')
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        window.location.href = '/auth/login'
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
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
              
              <Button variant="outline" size="sm" onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>

              <ThemeToggle />

              {/* Hamburger Menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHamburgerMenuOpen(!hamburgerMenuOpen)}
                  className="relative"
                >
                  {hamburgerMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>

                {/* Dropdown Menu */}
                {hamburgerMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-popover rounded-md shadow-lg border border-border z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          window.location.href = '/dashboard'
                          setHamburgerMenuOpen(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                      >
                        <BarChart3 className="h-4 w-4 mr-3" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          window.location.href = '/teams'
                          setHamburgerMenuOpen(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                      >
                        <Users className="h-4 w-4 mr-3" />
                        Team Collaboration
                      </button>
                      <button
                        onClick={() => {
                          window.location.href = '/settings'
                          setHamburgerMenuOpen(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </button>
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={() => {
                          handleLogout()
                          setHamburgerMenuOpen(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
  )
}

export default function AnalyticsPage() {
  return (
    <AnalyticsProvider>
      <AnalyticsContent />
    </AnalyticsProvider>
  )
}
