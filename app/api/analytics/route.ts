import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, createApiErrorNextResponse } from '@/lib/utils/error-handler'

/**
 * GET /api/analytics - Get comprehensive analytics data
 * Returns detailed analytics for the authenticated user and their teams
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d' // 7d, 30d, 90d, 1y
    const teamId = searchParams.get('teamId') // Optional: specific team analytics

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorNextResponse('Unauthorized', 401)
    }

    // Calculate date range
    const now = new Date()
    const timeRangeMap: { [key: string]: number } = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }
    const days = timeRangeMap[timeRange] || 30
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))

    // Get user's current team if teamId not specified
    let currentTeamId = teamId
    if (!currentTeamId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_team_id')
        .eq('id', user.id)
        .single()
      currentTeamId = profile?.current_team_id
    }

    // Get individual user analytics
    const userAnalytics = await getUserAnalytics(supabase, user.id, startDate)
    
    // Get team analytics if user is in a team
    let teamAnalytics = null
    if (currentTeamId) {
      teamAnalytics = await getTeamAnalytics(supabase, currentTeamId, startDate)
    }

    // Get usage trends over time
    const usageTrends = await getUsageTrends(supabase, user.id, currentTeamId, days)

    // Get document insights
    const documentInsights = await getDocumentInsights(supabase, user.id, currentTeamId, startDate)

    // Get analysis insights
    const analysisInsights = await getAnalysisInsights(supabase, user.id, currentTeamId, startDate)

    return NextResponse.json({
      success: true,
      analytics: {
        timeRange,
        period: {
          start: startDate.toISOString(),
          end: now.toISOString(),
          days
        },
        user: userAnalytics,
        team: teamAnalytics,
        trends: usageTrends,
        documents: documentInsights,
        analyses: analysisInsights
      }
    })

  } catch (error) {
    console.error('Error in GET /api/analytics:', error)
    return handleError(error, 'Failed to fetch analytics data')
  }
}

/**
 * Get individual user analytics
 */
async function getUserAnalytics(supabase: any, userId: string, startDate: Date) {
  // Get current month usage
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: currentUsage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', currentMonth)
    .single()

  // Get documents uploaded in time range
  const { data: documents } = await supabase
    .from('documents')
    .select('id, filename, file_size, file_type, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  // Get analyses performed in time range
  const { data: analyses } = await supabase
    .from('analyses')
    .select('id, analysis_type, status, created_at, completed_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false })

  // Get text extractions in time range
  const { data: extractions } = await supabase
    .from('text_extractions')
    .select('id, document_id, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())

  // Calculate totals
  const totalDocuments = documents?.length || 0
  const totalAnalyses = analyses?.length || 0
  const totalExtractions = extractions?.length || 0
  const totalStorage = documents?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0

  // Calculate success rates
  const completedAnalyses = analyses?.filter(a => a.status === 'completed').length || 0
  const analysisSuccessRate = totalAnalyses > 0 ? (completedAnalyses / totalAnalyses) * 100 : 0

  // Get file type distribution
  const fileTypeDistribution = documents?.reduce((acc: any, doc) => {
    const type = doc.file_type?.split('/')[0] || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {}) || {}

  return {
    currentMonthUsage: currentUsage || {
      documents_uploaded: 0,
      analyses_performed: 0,
      storage_used_bytes: 0,
      text_extractions: 0
    },
    periodStats: {
      documentsUploaded: totalDocuments,
      analysesPerformed: totalAnalyses,
      textExtractions: totalExtractions,
      storageUsedBytes: totalStorage,
      analysisSuccessRate: Math.round(analysisSuccessRate * 100) / 100
    },
    fileTypeDistribution,
    recentActivity: {
      documents: documents?.slice(0, 5) || [],
      analyses: analyses?.slice(0, 5) || []
    }
  }
}

/**
 * Get team analytics
 */
async function getTeamAnalytics(supabase: any, teamId: string, startDate: Date) {
  // Get team usage for current month
  const currentMonth = new Date().toISOString().slice(0, 7)
  const { data: teamUsage } = await supabase
    .from('team_usage_tracking')
    .select('*')
    .eq('team_id', teamId)
    .eq('month_year', currentMonth)
    .single()

  // Get team members
  const { data: members } = await supabase
    .from('team_members')
    .select(`
      id,
      role,
      status,
      user:profiles!team_members_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('team_id', teamId)
    .eq('status', 'active')

  // Get team documents
  const { data: teamDocuments } = await supabase
    .from('team_document_shares')
    .select(`
      id,
      access_level,
      created_at,
      document:documents!team_document_shares_document_id_fkey (
        id,
        filename,
        file_size,
        file_type,
        created_at
      )
    `)
    .eq('team_id', teamId)
    .gte('created_at', startDate.toISOString())

  // Get team analyses
  const { data: teamAnalyses } = await supabase
    .from('analyses')
    .select('id, analysis_type, status, created_at, completed_at')
    .eq('team_id', teamId)
    .gte('created_at', startDate.toISOString())

  // Calculate team stats
  const totalDocuments = teamDocuments?.length || 0
  const totalAnalyses = teamAnalyses?.length || 0
  const totalStorage = teamDocuments?.reduce((sum, share) => sum + (share.document?.file_size || 0), 0) || 0
  const activeMembers = members?.length || 0

  // Calculate member activity
  const memberActivity = members?.map(member => ({
    id: member.user.id,
    name: member.user.full_name || member.user.email,
    role: member.role,
    // Note: Individual member activity would require additional queries
    documentsShared: 0, // Placeholder
    analysesPerformed: 0 // Placeholder
  })) || []

  return {
    currentMonthUsage: teamUsage || {
      documents_uploaded: 0,
      analyses_performed: 0,
      storage_used_bytes: 0,
      text_extractions: 0
    },
    periodStats: {
      documentsShared: totalDocuments,
      analysesPerformed: totalAnalyses,
      storageUsedBytes: totalStorage,
      activeMembers
    },
    memberActivity,
    recentActivity: {
      documents: teamDocuments?.slice(0, 5) || [],
      analyses: teamAnalyses?.slice(0, 5) || []
    }
  }
}

/**
 * Get usage trends over time
 */
async function getUsageTrends(supabase: any, userId: string, teamId: string | null, days: number) {
  const trends = []
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
    const dateStr = date.toISOString().split('T')[0]

    // Get daily documents
    const { data: documents } = await supabase
      .from('documents')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', dateStr + 'T00:00:00')
      .lt('created_at', dateStr + 'T23:59:59')

    // Get daily analyses
    const { data: analyses } = await supabase
      .from('analyses')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', dateStr + 'T00:00:00')
      .lt('created_at', dateStr + 'T23:59:59')

    trends.push({
      date: dateStr,
      documents: documents?.length || 0,
      analyses: analyses?.length || 0
    })
  }

  return trends
}

/**
 * Get document insights
 */
async function getDocumentInsights(supabase: any, userId: string, teamId: string | null, startDate: Date) {
  // Get all documents in time range
  const { data: documents } = await supabase
    .from('documents')
    .select('id, filename, file_size, file_type, created_at')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())

  if (!documents || documents.length === 0) {
    return {
      totalDocuments: 0,
      totalSize: 0,
      averageSize: 0,
      fileTypeBreakdown: {},
      largestDocument: null,
      mostRecentDocument: null
    }
  }

  // Calculate insights
  const totalSize = documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0)
  const averageSize = totalSize / documents.length

  // File type breakdown
  const fileTypeBreakdown = documents.reduce((acc: any, doc) => {
    const type = doc.file_type?.split('/')[0] || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  // Find largest document
  const largestDocument = documents.reduce((largest, doc) => 
    (doc.file_size || 0) > (largest.file_size || 0) ? doc : largest
  )

  // Most recent document
  const mostRecentDocument = documents[0] // Already sorted by created_at desc

  return {
    totalDocuments: documents.length,
    totalSize,
    averageSize,
    fileTypeBreakdown,
    largestDocument,
    mostRecentDocument
  }
}

/**
 * Get analysis insights
 */
async function getAnalysisInsights(supabase: any, userId: string, teamId: string | null, startDate: Date) {
  // Get all analyses in time range
  const { data: analyses } = await supabase
    .from('analyses')
    .select('id, analysis_type, status, created_at, completed_at, results')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())

  if (!analyses || analyses.length === 0) {
    return {
      totalAnalyses: 0,
      successRate: 0,
      averageProcessingTime: 0,
      analysisTypeBreakdown: {},
      mostCommonAnalysisType: null
    }
  }

  // Calculate success rate
  const completedAnalyses = analyses.filter(a => a.status === 'completed')
  const successRate = (completedAnalyses.length / analyses.length) * 100

  // Calculate average processing time
  const processingTimes = completedAnalyses
    .filter(a => a.created_at && a.completed_at)
    .map(a => {
      const start = new Date(a.created_at)
      const end = new Date(a.completed_at)
      const diffMs = end.getTime() - start.getTime()
      // Only include reasonable processing times (less than 1 hour)
      return diffMs > 0 && diffMs < 3600000 ? diffMs : null
    })
    .filter(time => time !== null) as number[]

  const averageProcessingTime = processingTimes.length > 0 
    ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
    : 0

  // Analysis type breakdown
  const analysisTypeBreakdown = analyses.reduce((acc: any, analysis) => {
    const type = analysis.analysis_type || 'unknown'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  // Most common analysis type
  const mostCommonAnalysisType = Object.entries(analysisTypeBreakdown)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || null

  return {
    totalAnalyses: analyses.length,
    successRate: Math.round(successRate * 100) / 100,
    averageProcessingTime: Math.round(averageProcessingTime / 1000), // Convert to seconds
    analysisTypeBreakdown,
    mostCommonAnalysisType
  }
}
