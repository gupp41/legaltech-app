"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle, Crown, Star, Zap } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface UsageData {
  current_plan: string
  documents_uploaded: number
  analyses_performed: number
  storage_used_bytes: number
  text_extractions: number
}

interface PlanLimits {
  maxDocuments: number
  maxAnalyses: number
  maxStorageBytes: number
  maxExtractions: number
}

const getPlanLimits = (plan: string): PlanLimits => {
  switch (plan) {
    case 'plus':
      return {
        maxDocuments: 50,
        maxAnalyses: 200,
        maxStorageBytes: 2 * 1024 * 1024 * 1024, // 2GB
        maxExtractions: 50
      }
    case 'max':
      return {
        maxDocuments: 2147483647, // Unlimited
        maxAnalyses: 2147483647, // Unlimited
        maxStorageBytes: 50 * 1024 * 1024 * 1024, // 50GB
        maxExtractions: 2147483647 // Unlimited
      }
    case 'free':
    default:
      return {
        maxDocuments: 5,
        maxAnalyses: 20,
        maxStorageBytes: 100 * 1024 * 1024, // 100MB
        maxExtractions: 5
      }
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getPlanIcon = (plan: string) => {
  switch (plan) {
    case 'max':
      return <Crown className="h-4 w-4 text-yellow-500" />
    case 'plus':
      return <Star className="h-4 w-4 text-blue-500" />
    default:
      return <Zap className="h-4 w-4 text-green-500" />
  }
}

const getPlanColor = (plan: string) => {
  switch (plan) {
    case 'max':
      return 'bg-gradient-to-r from-yellow-500 to-orange-500'
    case 'plus':
      return 'bg-gradient-to-r from-blue-500 to-purple-500'
    default:
      return 'bg-gradient-to-r from-green-500 to-emerald-500'
  }
}

const getUsagePercentage = (current: number, max: number): number => {
  if (max === 2147483647) return 0 // Unlimited
  return Math.min((current / max) * 100, 100)
}

const getUsageStatus = (percentage: number) => {
  if (percentage >= 100) return 'error'
  if (percentage >= 80) return 'warning'
  return 'success'
}

const getUsageColor = (status: string) => {
  switch (status) {
    case 'error':
      return 'text-red-500'
    case 'warning':
      return 'text-yellow-500'
    default:
      return 'text-green-500'
  }
}

export function UsageDisplay({ userId }: { userId: string }) {
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    if (userId) {
      fetchUsageData()
      
      // Set up real-time subscription to usage_tracking table
      const usageSubscription = supabase
        .channel('usage-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'usage_tracking',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            console.log('Usage data changed:', payload)
            // Refresh usage data when changes occur
            fetchUsageData()
          }
        )
        .subscribe()

      // Cleanup subscription
      return () => {
        usageSubscription.unsubscribe()
      }
    }
  }, [userId])

  // Expose refresh function to parent component
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.refreshUsageData = fetchUsageData
    }
  }, [])

  const fetchUsageData = async () => {
    try {
      setLoading(true)
      
      // First, try to fetch from the view (if schema exists)
      let { data, error } = await supabase
        .from('user_subscription_status')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.log('View not found, trying fallback approach:', error.message)
        
        // Fallback: Try to get basic user info and create mock data
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('current_plan, plan_start_date')
          .eq('id', userId)
          .single()

        if (userError) {
          console.error('Error fetching user data:', userError)
          // Create default free plan data
          setUsageData({
            current_plan: 'free',
            documents_uploaded: 0,
            analyses_performed: 0,
            storage_used_bytes: 0,
            text_extractions: 0
          })
          return
        }

        // Create mock usage data based on user plan
        setUsageData({
          current_plan: userData?.current_plan || 'free',
          documents_uploaded: 0,
          analyses_performed: 0,
          storage_used_bytes: 0,
          text_extractions: 0
        })
        return
      }

      setUsageData(data)
    } catch (err) {
      console.error('Error in fetchUsageData:', err)
      setError('Failed to load usage data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-pulse bg-gray-200 h-4 w-4 rounded"></div>
            Loading Usage...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 h-4 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !usageData) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            Usage Display Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error || 'No usage data available'}</p>
          <button 
            onClick={fetchUsageData}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Try again
          </button>
        </CardContent>
      </Card>
    )
  }

  const limits = getPlanLimits(usageData.current_plan)
  const planName = usageData.current_plan.charAt(0).toUpperCase() + usageData.current_plan.slice(1)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPlanIcon(usageData.current_plan)}
            <span>Subscription Status</span>
          </div>
          <Badge className={`${getPlanColor(usageData.current_plan)} text-white`}>
            {planName} Plan
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Documents Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Documents Uploaded</span>
            <span className={getUsageColor(getUsageStatus(getUsagePercentage(usageData.documents_uploaded, limits.maxDocuments)))}>
              {usageData.documents_uploaded} / {limits.maxDocuments === 2147483647 ? '∞' : limits.maxDocuments}
            </span>
          </div>
          {limits.maxDocuments !== 2147483647 && (
            <Progress 
              value={getUsagePercentage(usageData.documents_uploaded, limits.maxDocuments)} 
              className="h-2"
            />
          )}
        </div>

        {/* Analyses Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>AI Analyses</span>
            <span className={getUsageColor(getUsageStatus(getUsagePercentage(usageData.analyses_performed, limits.maxAnalyses)))}>
              {usageData.analyses_performed} / {limits.maxAnalyses === 2147483647 ? '∞' : limits.maxAnalyses}
            </span>
          </div>
          {limits.maxAnalyses !== 2147483647 && (
            <Progress 
              value={getUsagePercentage(usageData.analyses_performed, limits.maxAnalyses)} 
              className="h-2"
            />
          )}
        </div>

        {/* Storage Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Storage Used</span>
            <span className={getUsageColor(getUsageStatus(getUsagePercentage(usageData.storage_used_bytes, limits.maxStorageBytes)))}>
              {formatBytes(usageData.storage_used_bytes)} / {formatBytes(limits.maxStorageBytes)}
            </span>
          </div>
          <Progress 
            value={getUsagePercentage(usageData.storage_used_bytes, limits.maxStorageBytes)} 
            className="h-2"
          />
        </div>

        {/* Text Extractions Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Text Extractions</span>
            <span className={getUsageColor(getUsageStatus(getUsagePercentage(usageData.text_extractions, limits.maxExtractions)))}>
              {usageData.text_extractions} / {limits.maxExtractions === 2147483647 ? '∞' : limits.maxExtractions}
            </span>
          </div>
          {limits.maxExtractions !== 2147483647 && (
            <Progress 
              value={getUsagePercentage(usageData.text_extractions, limits.maxExtractions)} 
              className="h-2"
            />
          )}
        </div>

        {/* Usage Warnings */}
        {Object.entries({
          documents: { current: usageData.documents_uploaded, max: limits.maxDocuments, name: 'Documents' },
          analyses: { current: usageData.analyses_performed, max: limits.maxAnalyses, name: 'AI Analyses' },
          storage: { current: usageData.storage_used_bytes, max: limits.maxStorageBytes, name: 'Storage' },
          extractions: { current: usageData.text_extractions, max: limits.maxExtractions, name: 'Text Extractions' }
        }).map(([key, { current, max, name }]) => {
          if (max === 2147483647) return null // Skip unlimited items
          
          const percentage = (current / max) * 100
          if (percentage >= 100) {
            return (
              <div key={key} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{name} limit reached! Upgrade your plan to continue.</span>
              </div>
            )
          } else if (percentage >= 80) {
            return (
              <div key={key} className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-yellow-700 dark:text-yellow-300 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{name} usage is at {Math.round(percentage)}%. Consider upgrading soon.</span>
              </div>
            )
          }
          return null
        })}

        {/* Upgrade CTA for Free Users */}
        {usageData.current_plan === 'free' && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <div className="flex items-center gap-2 text-blue-700 text-sm">
              <Star className="h-4 w-4" />
              <span>
                <strong>Upgrade to Plus</strong> for 10x more capacity and advanced features!
              </span>
            </div>
          </div>
        )}



        {/* Refresh Button */}
        <button 
          onClick={fetchUsageData}
          className="w-full mt-2 text-sm text-gray-600 hover:text-gray-800 hover:underline"
        >
          Refresh usage data
        </button>
      </CardContent>
    </Card>
  )
}
