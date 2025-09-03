import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, createApiErrorResponse } from '@/lib/utils/error-handler'

/**
 * GET /api/teams - List user's teams
 * Returns all teams where the authenticated user is a member
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorResponse('Unauthorized', 401)
    }

    // Get teams where user is a member
    const { data: teams, error: teamsError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        role,
        status,
        joined_at,
        teams (
          id,
          name,
          description,
          created_at,
          updated_at,
          settings,
          billing_email,
          subscription_id
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (teamsError) {
      console.error('Error fetching teams:', teamsError)
      return createApiErrorResponse('Failed to fetch teams', 500)
    }

    // Get member count for each team
    const teamIds = teams?.map(t => t.team_id) || []
    const { data: memberCounts, error: memberCountError } = await supabase
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds)
      .eq('status', 'active')

    if (memberCountError) {
      console.error('Error fetching member counts:', memberCountError)
      return createApiErrorResponse('Failed to fetch member counts', 500)
    }

    // Group member counts by team
    const memberCountMap = memberCounts?.reduce((acc, member) => {
      acc[member.team_id] = (acc[member.team_id] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Format response
    const formattedTeams = teams?.map(team => ({
      id: team.teams.id,
      name: team.teams.name,
      description: team.teams.description,
      role: team.role,
      memberCount: memberCountMap[team.team_id] || 0,
      createdAt: team.teams.created_at,
      updatedAt: team.teams.updated_at,
      settings: team.teams.settings,
      billingEmail: team.teams.billing_email,
      subscriptionId: team.teams.subscription_id,
      joinedAt: team.joined_at
    })) || []

    return NextResponse.json({
      success: true,
      teams: formattedTeams
    })

  } catch (error) {
    console.error('Error in GET /api/teams:', error)
    return handleError(error, 'Failed to fetch teams')
  }
}

/**
 * POST /api/teams - Create new team
 * Creates a new team with the authenticated user as admin
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorResponse('Unauthorized', 401)
    }

    // Parse request body
    const body = await request.json()
    const { name, description, settings, billingEmail } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return createApiErrorResponse('Team name is required', 400)
    }

    if (name.length > 100) {
      return createApiErrorResponse('Team name must be 100 characters or less', 400)
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_by: user.id,
        settings: settings || {},
        billing_email: billingEmail?.trim() || null
      })
      .select()
      .single()

    if (teamError) {
      console.error('Error creating team:', teamError)
      return createApiErrorResponse('Failed to create team', 500)
    }

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'admin',
        invited_by: user.id,
        status: 'active',
        joined_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Error adding creator as team member:', memberError)
      // Clean up team if member creation fails
      await supabase.from('teams').delete().eq('id', team.id)
      return createApiErrorResponse('Failed to add creator to team', 500)
    }

    // Update user's current team if they don't have one
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_team_id, default_team_id')
      .eq('id', user.id)
      .single()

    if (!profile?.current_team_id) {
      await supabase
        .from('profiles')
        .update({
          current_team_id: team.id,
          default_team_id: team.id
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        role: 'admin',
        memberCount: 1,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
        settings: team.settings,
        billingEmail: team.billing_email,
        subscriptionId: team.subscription_id
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/teams:', error)
    return handleError(error, 'Failed to create team')
  }
}
