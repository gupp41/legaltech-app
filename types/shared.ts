/**
 * Shared Type Definitions
 * Centralized type definitions used across the application
 */

// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

export interface User {
  id: string
  email: string
  current_plan: string
  plan_start_date: string
  plan_end_date?: string
}

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  role?: string
  created_at: string
  updated_at: string
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export interface Document {
  id: string
  filename: string
  file_url: string
  file_size: number
  file_type: string
  document_type: string
  status: string
  created_at: string
  storage_path?: string
  jurisdiction?: string
  client_name?: string
  analysis?: any
  analysis_status?: string
  analysis_created_at?: string
  analysis_updated_at?: string
  text_extraction?: string
  text_extraction_status?: string
  text_extraction_created_at?: string
  text_extraction_updated_at?: string
  file_hash?: string
  metadata?: any
}

export interface ExtractedText {
  text: string
  wordCount: number
  success: boolean
  error?: string
}

// ============================================================================
// SUBSCRIPTION TYPES
// ============================================================================

export interface Subscription {
  id: string
  plan_type: string
  status: string
  start_date: string
  end_date?: string
  stripe_subscription_id?: string
  current_period_start?: string
  current_period_end?: string
  created_at?: string
  updated_at?: string
}

export interface SubscriptionStatus {
  isActive: boolean
  plan: string
  status: string
  expiresAt?: string
  isPastDue: boolean
}

export interface PlanLimits {
  maxDocuments: number
  maxAnalyses: number
  maxStorageBytes: number
  maxExtractions: number
}

// ============================================================================
// USAGE TRACKING TYPES
// ============================================================================

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

export interface UsageData {
  current_plan: string
  documents_uploaded: number
  analyses_performed: number
  storage_used_bytes: number
  text_extractions: number
}

export interface UsageCheckResult {
  allowed: boolean
  currentUsage: CurrentUsage
  limits: UsageLimits
  warnings: string[]
  errors: string[]
}

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

export interface StructuredAnalysis {
  summary: {
    document_purpose: string
    document_type: string
    key_obligations: string[]
    overall_assessment: 'low_risk' | 'medium_risk' | 'high_risk'
  }
  risk_analysis?: {
    overall_risk_level: 'low' | 'medium' | 'high'
    risk_factors: RiskItem[]
  }
  identified_clauses?: {
    key_terms: ClauseItem[]
    conditions: ClauseItem[]
    obligations: ClauseItem[]
    rights: ClauseItem[]
  }
  missing_clauses?: {
    recommended_clauses: string[]
    critical_missing: string[]
    optional_missing: string[]
  }
  compliance_considerations?: {
    compliance_score: 'excellent' | 'good' | 'fair' | 'poor'
    regulatory_requirements: string[]
    potential_violations: string[]
  }
  metadata?: AnalysisMetadata
}

export interface RiskItem {
  clause: string
  risk_level: 'high' | 'medium' | 'low'
  description: string
  impact: string
  recommendation: string
}

export interface ClauseItem {
  name: string
  description: string
  importance: 'critical' | 'important' | 'standard'
  implications: string
  page_reference?: string
}

export interface AnalysisMetadata {
  model: string
  provider: string
  tokens_used: number
  analysis_timestamp: string
  document_analyzed: string
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface FileUploadProps {
  onUploadComplete?: (file: any) => void
  className?: string
}

export interface UsageDisplayProps {
  userId: string
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  email: string
  password: string
  confirmPassword: string
  role?: string
}

export interface ContactForm {
  name: string
  email: string
  subject: string
  message: string
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export interface NavigationItem {
  id: string
  title: string
  emoji: string
  href?: string
  onClick?: () => void
}

export interface BreadcrumbItem {
  label: string
  href?: string
  current?: boolean
}

// ============================================================================
// THEME TYPES
// ============================================================================

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeConfig {
  theme: Theme
  setTheme: (theme: Theme) => void
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Status = 'idle' | 'loading' | 'success' | 'error'

export type PlanType = 'free' | 'plus' | 'max'

export type Importance = 'critical' | 'important' | 'standard'

export type RiskLevel = 'low' | 'medium' | 'high'

export type ComplianceScore = 'excellent' | 'good' | 'fair' | 'poor'

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface FileUploadEvent {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error'
  error?: string
}

export interface AnalysisEvent {
  documentId: string
  status: 'started' | 'processing' | 'complete' | 'error'
  progress?: number
  error?: string
  result?: StructuredAnalysis
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface AppConfig {
  name: string
  version: string
  environment: 'development' | 'staging' | 'production'
  apiUrl: string
  features: {
    fileUpload: boolean
    analysis: boolean
    sharing: boolean
    export: boolean
  }
}

export interface FeatureFlags {
  enableAdvancedAnalysis: boolean
  enableSharing: boolean
  enableExport: boolean
  enableNotifications: boolean
}
