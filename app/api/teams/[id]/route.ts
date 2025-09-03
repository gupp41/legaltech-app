import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, createApiErrorResponse } from '@/lib/utils/error-handler'

/**
 * GET /api/teams/[id] - Get team details
 * Returns detailed information about a specific team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const teamId = params.id

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorResponse('Unauthorized', 401)
    }

    // Check if user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role, status')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return createApiErrorResponse('Team not found or access denied', 404)
    }

    // Get team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError) {
      console.error('Error fetching team:', teamError)
      return createApiErrorResponse('Failed to fetch team', 500)
    }

    // Get team members
    const { data: members, error: membersError } = await supabase
      .from('team_member_details')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching team members:', membersError)
      return createApiErrorResponse('Failed to fetch team members', 500)
    }

    // Get team usage statistics (current month)
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
    const { data: usage, error: usageError } = await supabase
      .from('team_usage_tracking')
      .select('*')
      .eq('team_id', teamId)
      .eq('month_year', currentMonth)
      .single()

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching team usage:', usageError)
      return createApiErrorResponse('Failed to fetch team usage', 500)
    }

    // Get shared documents count
    const { data: sharedDocs, error: sharedDocsError } = await supabase
      .from('team_document_shares')
      .select('id')
      .eq('team_id', teamId)

    if (sharedDocsError) {
      console.error('Error fetching shared documents count:', sharedDocsError)
      return createApiErrorResponse('Failed to fetch shared documents count', 500)
    }

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        createdBy: team.created_by,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        settings: team.settings,
        billingEmail: team.billing_email,
        subscriptionId: team.subscription_id,
        userRole: membership.role,
        memberCount: members?.length || 0,
        members: members?.map(member => ({
          id: member.id,
          userId: member.user_id,
          role: member.role,
          status: member.status,
          joinedAt: member.joined_at,
          fullName: member.full_name,
          email: member.email,
          companyName: member.company_name
        })) || [],
        usage: usage ? {
          documentsUploaded: usage.documents_uploaded,
          analysesPerformed: usage.analyses_performed,
          storageUsedBytes: usage.storage_used_bytes,
          textExtractions: usage.text_extractions,
          monthYear: usage.month_year
        } : null,
        sharedDocumentsCount: sharedDocs?.length || 0
      }
    })

  } catch (error) {
    console.error('Error in GET /api/teams/[id]:', error)
    return handleError(error, 'Failed to fetch team details')
  }
}

/**
 * PUT /api/teams/[id] - Update team settings
 * Updates team information (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const teamId = params.id

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorResponse('Unauthorized', 401)
    }

    // Check if user is admin of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership || membership.role !== 'admin') {
      return createApiErrorResponse('Admin access required', 403)
    }

    // Parse request body
    const body = await request.json()
    const { name, description, settings, billingEmail } = body

    // Validate fields
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return createApiErrorResponse('Team name cannot be empty', 400)
      }
      if (name.length > 100) {
        return createApiErrorResponse('Team name must be 100 characters or less', 400)
      }
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (settings !== undefined) updateData.settings = settings
    if (billingEmail !== undefined) updateData.billing_email = billingEmail?.trim() || null

    // Update team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single()

    if (teamError) {
      console.error('Error updating team:', teamError)
      return createApiErrorResponse('Failed to update team', 500)
    }

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        settings: team.settings,
        billingEmail: team.billing_email,
        subscriptionId: team.subscription_id
      }
    })

  } catch (error) {
    console.error('Error in PUT /api/teams/[id]:', error)
    return handleError(error, 'Failed to update team')
  }
}

/**
 * DELETE /api/teams/[id] - Delete team
 * Deletes a team (creator only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const teamId = params.id

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorResponse('Unauthorized', 401)
    }

    // Check if user is the team creator
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('created_by, name')
      .eq('id', teamId)
      .single()

    if (teamError) {
      console.error('Error fetching team:', teamError)
      return createApiErrorResponse('Team not found', 404)
    }

    if (team.created_by !== user.id) {
      return createApiErrorResponse('Only team creator can delete team', 403)
    }

    // Check if team has other members
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .neq('user_id', user.id)
      .eq('status', 'active')

    if (membersError) {
      console.error('Error checking team members:', membersError)
      return createApiErrorResponse('Failed to check team members', 500)
    }

    if (members && members.length > 0) {
      return createApiErrorResponse('Cannot delete team with active members. Please remove all members first.', 400)
    }

    // Delete team (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (deleteError) {
      console.error('Error deleting team:', deleteError)
      return createApiErrorResponse('Failed to delete team', 500)
    }

    // Update user's current team if it was the deleted team
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_team_id, default_team_id')
      .eq('id', user.id)
      .single()

    if (profile?.current_team_id === teamId) {
      // Find another team to set as current
      const { data: otherTeams } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)

      const newCurrentTeamId = otherTeams?.[0]?.team_id || null

      await supabase
        .from('profiles')
        .update({
          current_team_id: newCurrentTeamId,
          default_team_id: newCurrentTeamId
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: `Team "${team.name}" has been deleted successfully`
    })

  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]:', error)
    return handleError(error, 'Failed to delete team')
  }
}
