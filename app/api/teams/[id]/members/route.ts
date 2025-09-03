import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, createApiErrorNextResponse } from '@/lib/utils/error-handler'

/**
 * GET /api/teams/[id]/members - Get team members
 * Returns all members of a specific team
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId } = await params

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorNextResponse('Unauthorized', 401)
    }

    // Check if user is a member of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role, status')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.status !== 'active') {
      return createApiErrorNextResponse('Access denied. You must be a member of this team.', 403)
    }

    // Get all team members with user details
    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        status,
        invited_at,
        joined_at,
        profiles (
          id,
          full_name,
          email,
          company_name
        )
      `)
      .eq('team_id', teamId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.error('Error fetching team members:', membersError)
      return createApiErrorNextResponse('Failed to fetch team members', 500)
    }

    // Format response
    const formattedMembers = members?.map(member => ({
      id: member.id,
      role: member.role,
      status: member.status,
      invitedAt: member.invited_at,
      joinedAt: member.joined_at,
      user: {
        id: member.profiles.id,
        fullName: member.profiles.full_name,
        email: member.profiles.email,
        companyName: member.profiles.company_name
      }
    })) || []

    return NextResponse.json({
      success: true,
      members: formattedMembers,
      totalCount: formattedMembers.length
    })

  } catch (error) {
    console.error('Error in GET /api/teams/[id]/members:', error)
    return handleError(error, 'Failed to fetch team members')
  }
}

/**
 * POST /api/teams/[id]/members - Add team member
 * Adds a new member to the team (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId } = await params

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorNextResponse('Unauthorized', 401)
    }

    // Check if user is an admin of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role, status')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership || membership.status !== 'active' || membership.role !== 'admin') {
      return createApiErrorNextResponse('Access denied. Admin role required.', 403)
    }

    // Parse request body
    const body = await request.json()
    const { userId, role = 'member' } = body

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return createApiErrorNextResponse('User ID is required', 400)
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return createApiErrorNextResponse('Invalid role. Must be admin, member, or viewer.', 400)
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return createApiErrorNextResponse('User not found', 404)
    }

    // Check if user is already a member
    const { data: existingMember, error: existingError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (existingMember) {
      if (existingMember.status === 'active') {
        return createApiErrorNextResponse('User is already a member of this team', 409)
      } else if (existingMember.status === 'pending') {
        return createApiErrorNextResponse('User has a pending invitation to this team', 409)
      }
    }

    // Add user as team member
    const { data: newMember, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role: role,
        invited_by: user.id,
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .select(`
        id,
        role,
        status,
        invited_at,
        joined_at,
        profiles (
          id,
          full_name,
          email,
          company_name
        )
      `)
      .single()

    if (memberError) {
      console.error('Error adding team member:', memberError)
      return createApiErrorNextResponse('Failed to add team member', 500)
    }

    // Format response
    const formattedMember = {
      id: newMember.id,
      role: newMember.role,
      status: newMember.status,
      invitedAt: newMember.invited_at,
      joinedAt: newMember.joined_at,
      user: {
        id: newMember.profiles.id,
        fullName: newMember.profiles.full_name,
        email: newMember.profiles.email,
        companyName: newMember.profiles.company_name
      }
    }

    return NextResponse.json({
      success: true,
      member: formattedMember,
      message: 'Team member added successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/teams/[id]/members:', error)
    return handleError(error, 'Failed to add team member')
  }
}
