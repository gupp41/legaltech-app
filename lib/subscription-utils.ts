// 🔧 Subscription Status Utilities
// This file provides utilities for checking and validating subscription status

import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SubscriptionStatus {
  isActive: boolean
  plan: string
  status: string
  expiresAt?: string
  isPastDue: boolean
  isTrial: boolean
  daysUntilExpiry?: number
  hasExcessUsage: boolean
  excessUsage?: {
    documents: number
    analyses: number
    extractions: number
    storage: number
  }
}

/**
 * Get the current subscription status for a user
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  try {
    // Get the most recent active subscription
    const { data: subscription, error } = await supabase
      .from('active_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !subscription) {
      // No active subscription found, check for excess usage
      const excessUsage = await checkExcessUsage(userId)
      return {
        isActive: false,
        plan: 'free',
        status: 'free',
        isPastDue: false,
        isTrial: false,
        hasExcessUsage: excessUsage.hasExcess,
        excessUsage: excessUsage.excess
      }
    }

    const now = new Date()
    const expiresAt = subscription.current_period_end ? new Date(subscription.current_period_end) : null
    const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : undefined

    // Check for excess usage even for active subscriptions
    const excessUsage = await checkExcessUsage(userId)

    return {
      isActive: subscription.status === 'active' || subscription.status === 'trialing',
      plan: subscription.effective_plan || subscription.plan_type,
      status: subscription.status,
      expiresAt: subscription.current_period_end,
      isPastDue: subscription.status === 'past_due',
      isTrial: subscription.status === 'trialing',
      daysUntilExpiry,
      hasExcessUsage: excessUsage.hasExcess,
      excessUsage: excessUsage.excess
    }
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return {
      isActive: false,
      plan: 'free',
      status: 'error',
      isPastDue: false,
      isTrial: false
    }
  }
}

/**
 * Check if a user has access to a specific feature based on their plan
 */
export async function hasFeatureAccess(userId: string, feature: string): Promise<boolean> {
  try {
    const subscriptionStatus = await getSubscriptionStatus(userId)
    
    // Get plan details to check feature access
    const { data: planDetails, error } = await supabase
      .from('plan_details')
      .select('features, limits')
      .eq('plan_type', subscriptionStatus.plan)
      .single()

    if (error || !planDetails) {
      return false
    }

    // Check if the feature is included in the plan
    const features = planDetails.features || []
    return features.includes(feature)
  } catch (error) {
    console.error('Error checking feature access:', error)
    return false
  }
}

/**
 * Check if a user is within their usage limits
 */
export async function checkUsageLimits(userId: string, usageType: 'documents' | 'analyses' | 'storage' | 'extractions'): Promise<{
  isWithinLimit: boolean
  currentUsage: number
  limit: number
  percentage: number
}> {
  try {
    const subscriptionStatus = await getSubscriptionStatus(userId)
    
    // Get plan limits
    const { data: planDetails, error } = await supabase
      .from('plan_details')
      .select('limits')
      .eq('plan_type', subscriptionStatus.plan)
      .single()

    if (error || !planDetails) {
      return {
        isWithinLimit: false,
        currentUsage: 0,
        limit: 0,
        percentage: 100
      }
    }

    const limits = planDetails.limits || {}
    const limit = limits[usageType] || 0

    // Get current usage for this month
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single()

    if (usageError || !usage) {
      return {
        isWithinLimit: true,
        currentUsage: 0,
        limit,
        percentage: 0
      }
    }

    let currentUsage = 0
    switch (usageType) {
      case 'documents':
        currentUsage = usage.documents_uploaded || 0
        break
      case 'analyses':
        currentUsage = usage.analyses_performed || 0
        break
      case 'storage':
        currentUsage = usage.storage_used_bytes || 0
        break
      case 'extractions':
        currentUsage = usage.text_extractions || 0
        break
    }

    const percentage = limit > 0 ? (currentUsage / limit) * 100 : 0
    const isWithinLimit = limit === -1 || currentUsage < limit // -1 means unlimited

    return {
      isWithinLimit,
      currentUsage,
      limit,
      percentage
    }
  } catch (error) {
    console.error('Error checking usage limits:', error)
    return {
      isWithinLimit: false,
      currentUsage: 0,
      limit: 0,
      percentage: 100
    }
  }
}

/**
 * Get subscription status with user-friendly messages
 */
export async function getSubscriptionStatusMessage(userId: string): Promise<{
  status: string
  message: string
  actionRequired: boolean
  actionText?: string
}> {
  try {
    const subscriptionStatus = await getSubscriptionStatus(userId)

    if (subscriptionStatus.plan === 'free') {
      return {
        status: 'free',
        message: 'You are on the Free plan',
        actionRequired: false
      }
    }

    if (subscriptionStatus.isTrial) {
      return {
        status: 'trial',
        message: `You are on a trial of the ${subscriptionStatus.plan} plan`,
        actionRequired: false
      }
    }

    if (subscriptionStatus.isPastDue) {
      return {
        status: 'past_due',
        message: 'Your payment failed. Please update your payment method to continue using premium features.',
        actionRequired: true,
        actionText: 'Update Payment Method'
      }
    }

    if (subscriptionStatus.isActive) {
      if (subscriptionStatus.daysUntilExpiry && subscriptionStatus.daysUntilExpiry <= 7) {
        return {
          status: 'expiring_soon',
          message: `Your ${subscriptionStatus.plan} plan expires in ${subscriptionStatus.daysUntilExpiry} days`,
          actionRequired: false
        }
      }
      
      return {
        status: 'active',
        message: `You are on the ${subscriptionStatus.plan} plan`,
        actionRequired: false
      }
    }

    return {
      status: 'unknown',
      message: 'Unable to determine subscription status',
      actionRequired: false
    }
  } catch (error) {
    console.error('Error getting subscription status message:', error)
    return {
      status: 'error',
      message: 'Error loading subscription status',
      actionRequired: false
    }
  }
}

/**
 * Check if a user has excess usage beyond their current plan limits
 */
async function checkExcessUsage(userId: string): Promise<{
  hasExcess: boolean
  excess?: {
    documents: number
    analyses: number
    extractions: number
    storage: number
  }
}> {
  try {
    // Get current usage
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    const { data: usage, error: usageError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single()

    if (usageError || !usage) {
      return { hasExcess: false }
    }

    // Get current plan limits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('current_plan')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return { hasExcess: false }
    }

    const { data: planDetails, error: planError } = await supabase
      .from('plan_details')
      .select('limits')
      .eq('plan_type', profile.current_plan)
      .single()

    if (planError || !planDetails) {
      return { hasExcess: false }
    }

    const limits = planDetails.limits || {}
    const documentLimit = limits.documents || 0
    const analysisLimit = limits.analyses || 0
    const extractionLimit = limits.extractions || 0
    const storageLimit = limits.storage || 0

    // Calculate excess usage
    const excessDocuments = Math.max(0, (usage.documents_uploaded || 0) - documentLimit)
    const excessAnalyses = Math.max(0, (usage.analyses_performed || 0) - analysisLimit)
    const excessExtractions = Math.max(0, (usage.text_extractions || 0) - extractionLimit)
    const excessStorage = Math.max(0, (usage.storage_used_bytes || 0) - storageLimit)

    const hasExcess = excessDocuments > 0 || excessAnalyses > 0 || excessExtractions > 0 || excessStorage > 0

    return {
      hasExcess,
      excess: hasExcess ? {
        documents: excessDocuments,
        analyses: excessAnalyses,
        extractions: excessExtractions,
        storage: excessStorage
      } : undefined
    }
  } catch (error) {
    console.error('Error checking excess usage:', error)
    return { hasExcess: false }
  }
}

/**
 * Get excess usage information for a user
 */
export async function getExcessUsageInfo(userId: string): Promise<{
  hasExcess: boolean
  excessUsage?: {
    documents: number
    analyses: number
    extractions: number
    storage: number
  }
  message?: string
  actionRequired: boolean
}> {
  try {
    const excessInfo = await checkExcessUsage(userId)
    
    if (!excessInfo.hasExcess) {
      return {
        hasExcess: false,
        actionRequired: false
      }
    }

    const excess = excessInfo.excess!
    let message = 'You are currently using more resources than your plan allows:'
    let actionRequired = true

    if (excess.documents > 0) {
      message += `\n• ${excess.documents} excess documents`
    }
    if (excess.analyses > 0) {
      message += `\n• ${excess.analyses} excess analyses`
    }
    if (excess.extractions > 0) {
      message += `\n• ${excess.extractions} excess text extractions`
    }
    if (excess.storage > 0) {
      const excessStorageMB = Math.round(excess.storage / (1024 * 1024))
      message += `\n• ${excessStorageMB} MB excess storage`
    }

    message += '\n\nYou can either upgrade your plan or clean up some content to stay within limits.'

    return {
      hasExcess: true,
      excessUsage: excess,
      message,
      actionRequired
    }
  } catch (error) {
    console.error('Error getting excess usage info:', error)
    return {
      hasExcess: false,
      actionRequired: false
    }
  }
}
