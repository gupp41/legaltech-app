'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Types
interface AnalyticsData {
  timeRange: string
  period: {
    start: string
    end: string
    days: number
  }
  user: {
    currentMonthUsage: {
      documents_uploaded: number
      analyses_performed: number
      storage_used_bytes: number
      text_extractions: number
    }
    periodStats: {
      documentsUploaded: number
      analysesPerformed: number
      textExtractions: number
      storageUsedBytes: number
      analysisSuccessRate: number
    }
    fileTypeDistribution: { [key: string]: number }
    recentActivity: {
      documents: any[]
      analyses: any[]
    }
  }
  team?: {
    currentMonthUsage: {
      documents_uploaded: number
      analyses_performed: number
      storage_used_bytes: number
      text_extractions: number
    }
    periodStats: {
      documentsShared: number
      analysesPerformed: number
      storageUsedBytes: number
      activeMembers: number
    }
    memberActivity: Array<{
      id: string
      name: string
      role: string
      documentsShared: number
      analysesPerformed: number
    }>
    recentActivity: {
      documents: any[]
      analyses: any[]
    }
  }
  trends: Array<{
    date: string
    documents: number
    analyses: number
  }>
  documents: {
    totalDocuments: number
    totalSize: number
    averageSize: number
    fileTypeBreakdown: { [key: string]: number }
    largestDocument: any
    mostRecentDocument: any
  }
  analyses: {
    totalAnalyses: number
    successRate: number
    averageProcessingTime: number
    analysisTypeBreakdown: { [key: string]: number }
    mostCommonAnalysisType: string | null
  }
}

interface AnalyticsContextType {
  data: AnalyticsData | null
  loading: boolean
  error: string | null
  timeRange: string
  setTimeRange: (range: string) => void
  refreshData: () => Promise<void>
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined)

interface AnalyticsProviderProps {
  children: ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30d')

  const fetchAnalytics = async (range: string = timeRange) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/analytics?timeRange=${range}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      setData(result.analytics)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics'
      setError(errorMessage)
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    await fetchAnalytics(timeRange)
  }

  useEffect(() => {
    fetchAnalytics(timeRange)
  }, [timeRange])

  const value: AnalyticsContextType = {
    data,
    loading,
    error,
    timeRange,
    setTimeRange,
    refreshData
  }

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext)
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider')
  }
  return context
}
