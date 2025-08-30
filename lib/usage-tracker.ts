import { createClient } from '@supabase/supabase-js'

export interface UsageLimits {
  maxDocuments: number
  maxAnalyses: number
  maxStorageBytes: number
  maxExtractions: number
}

export interface CurrentUsage {
  documentsUploaded: number
  analysesPerformed: number
  storageUsedBytes: number
  textExtractions: number
}

export interface UsageCheckResult {
  allowed: boolean
  currentUsage: CurrentUsage
  limits: UsageLimits
  warnings: string[]
  errors: string[]
}

export class UsageTracker {
  private supabase: any

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }

  /**
   * Get the current month usage for a user
   */
  async getCurrentMonthUsage(userId: string): Promise<CurrentUsage> {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    
    const { data, error } = await this.supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching usage:', error)
      return {
        documentsUploaded: 0,
        analysesPerformed: 0,
        storageUsedBytes: 0,
        textExtractions: 0
      }
    }

    if (!data) {
      // Create new usage record for the month
      await this.initializeMonthUsage(userId, currentMonth)
      return {
        documentsUploaded: 0,
        analysesPerformed: 0,
        storageUsedBytes: 0,
        textExtractions: 0
      }
    }

    return {
      documentsUploaded: data.documents_uploaded || 0,
      analysesPerformed: data.analyses_performed || 0,
      storageUsedBytes: data.storage_used_bytes || 0,
      textExtractions: data.text_extractions || 0
    }
  }

  /**
   * Get plan limits for a user
   */
  async getPlanLimits(userId: string): Promise<UsageLimits> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('current_plan')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user plan:', error)
      return this.getDefaultLimits()
    }

    const plan = user?.current_plan || 'free'
    return this.getLimitsForPlan(plan)
  }

  /**
   * Check if an action is allowed based on current usage
   */
  async checkUsage(
    userId: string, 
    action: 'upload' | 'analysis' | 'extraction',
    additionalStorage?: number
  ): Promise<UsageCheckResult> {
    const [currentUsage, limits] = await Promise.all([
      this.getCurrentMonthUsage(userId),
      this.getPlanLimits(userId)
    ])

    const warnings: string[] = []
    const errors: string[] = []

    // Check document uploads
    if (action === 'upload') {
      if (currentUsage.documentsUploaded >= limits.maxDocuments) {
        errors.push(`Document upload limit reached (${limits.maxDocuments}/${limits.maxDocuments})`)
      } else if (currentUsage.documentsUploaded >= limits.maxDocuments * 0.8) {
        warnings.push(`Document upload limit warning: ${currentUsage.documentsUploaded}/${limits.maxDocuments}`)
      }
    }

    // Check analyses
    if (action === 'analysis') {
      if (currentUsage.analysesPerformed >= limits.maxAnalyses) {
        errors.push(`Analysis limit reached (${limits.maxAnalyses}/${limits.maxAnalyses})`)
      } else if (currentUsage.analysesPerformed >= limits.maxAnalyses * 0.8) {
        warnings.push(`Analysis limit warning: ${currentUsage.analysesPerformed}/${limits.maxAnalyses}`)
      }
    }

    // Check text extractions
    if (action === 'extraction') {
      if (currentUsage.textExtractions >= limits.maxExtractions) {
        errors.push(`Text extraction limit reached (${limits.maxExtractions}/${limits.maxExtractions})`)
      } else if (currentUsage.textExtractions >= limits.maxExtractions * 0.8) {
        warnings.push(`Text extraction limit warning: ${currentUsage.textExtractions}/${limits.maxExtractions}`)
      }
    }

    // Check storage (for uploads)
    if (action === 'upload' && additionalStorage) {
      const newTotalStorage = currentUsage.storageUsedBytes + additionalStorage
      if (newTotalStorage > limits.maxStorageBytes) {
        errors.push(`Storage limit exceeded: ${this.formatBytes(newTotalStorage)}/${this.formatBytes(limits.maxStorageBytes)}`)
      } else if (newTotalStorage > limits.maxStorageBytes * 0.8) {
        warnings.push(`Storage limit warning: ${this.formatBytes(newTotalStorage)}/${this.formatBytes(limits.maxStorageBytes)}`)
      }
    }

    const allowed = errors.length === 0

    return {
      allowed,
      currentUsage,
      limits,
      warnings,
      errors
    }
  }

  /**
   * Increment usage for a specific action
   */
  async incrementUsage(
    userId: string,
    action: 'upload' | 'analysis' | 'extraction',
    additionalStorage?: number
  ): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7)
    
    // Get current usage or create new record
    let { data: usage } = await this.supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', currentMonth)
      .single()

    if (!usage) {
      await this.initializeMonthUsage(userId, currentMonth)
      usage = {
        documents_uploaded: 0,
        analyses_performed: 0,
        storage_used_bytes: 0,
        text_extractions: 0
      }
    }

    // Update usage based on action
    const updates: any = {}
    
    switch (action) {
      case 'upload':
        updates.documents_uploaded = (usage.documents_uploaded || 0) + 1
        if (additionalStorage) {
          updates.storage_used_bytes = (usage.storage_used_bytes || 0) + additionalStorage
        }
        break
      case 'analysis':
        updates.analyses_performed = (usage.analyses_performed || 0) + 1
        break
      case 'extraction':
        updates.text_extractions = (usage.text_extractions || 0) + 1
        break
    }

    // Upsert the usage record
    const { error } = await this.supabase
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        month_year: currentMonth,
        ...updates
      })

    if (error) {
      console.error('Error updating usage:', error)
      throw new Error('Failed to update usage tracking')
    }
  }

  /**
   * Initialize usage tracking for a new month
   */
  private async initializeMonthUsage(userId: string, monthYear: string): Promise<void> {
    const { error } = await this.supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        month_year: monthYear,
        documents_uploaded: 0,
        analyses_performed: 0,
        storage_used_bytes: 0,
        text_extractions: 0
      })

    if (error) {
      console.error('Error initializing month usage:', error)
    }
  }

  /**
   * Get limits for a specific plan
   */
  private getLimitsForPlan(plan: string): UsageLimits {
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

  /**
   * Get default limits (fallback)
   */
  private getDefaultLimits(): UsageLimits {
    return this.getLimitsForPlan('free')
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Reset usage for all users (monthly cron job)
   */
  async resetMonthlyUsage(): Promise<void> {
    // This would typically be called by a cron job or scheduled function
    // For now, we'll just log that it should be implemented
    console.log('Monthly usage reset should be implemented as a scheduled job')
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker()
