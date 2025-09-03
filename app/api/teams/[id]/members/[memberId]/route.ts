import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, createApiErrorNextResponse } from '@/lib/utils/error-handler'

/**
 * PUT /api/teams/[id]/members/[memberId] - Update team member role
 * Updates a team member's role (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId, memberId } = await params

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
    const { role } = body

    // Validate role
    if (!role || !['admin', 'member', 'viewer'].includes(role)) {
      return createApiErrorNextResponse('Invalid role. Must be admin, member, or viewer.', 400)
    }

    // Check if target member exists and is part of the team
    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        status,
        user_id,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single()

    if (targetError || !targetMember) {
      return createApiErrorNextResponse('Team member not found', 404)
    }

    if (targetMember.status !== 'active') {
      return createApiErrorNextResponse('Cannot update role of inactive member', 400)
    }

    // Prevent user from changing their own role if they're the only admin
    if (targetMember.user_id === user.id && targetMember.role === 'admin') {
      const { data: adminCount, error: adminCountError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('role', 'admin')
        .eq('status', 'active')

      if (adminCountError || !adminCount || adminCount.length <= 1) {
        return createApiErrorNextResponse('Cannot change role. Team must have at least one admin.', 400)
      }
    }

    // Update member role
    const { data: updatedMember, error: updateError } = await supabase
      .from('team_members')
      .update({ role: role })
      .eq('id', memberId)
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

    if (updateError) {
      console.error('Error updating team member role:', updateError)
      return createApiErrorNextResponse('Failed to update team member role', 500)
    }

    // Format response
    const formattedMember = {
      id: updatedMember.id,
      role: updatedMember.role,
      status: updatedMember.status,
      invitedAt: updatedMember.invited_at,
      joinedAt: updatedMember.joined_at,
      user: {
        id: updatedMember.profiles.id,
        fullName: updatedMember.profiles.full_name,
        email: updatedMember.profiles.email,
        companyName: updatedMember.profiles.company_name
      }
    }

    return NextResponse.json({
      success: true,
      member: formattedMember,
      message: 'Team member role updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/teams/[id]/members/[memberId]:', error)
    return handleError(error, 'Failed to update team member role')
  }
}

/**
 * DELETE /api/teams/[id]/members/[memberId] - Remove team member
 * Removes a member from the team (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId, memberId } = await params

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

    // Check if target member exists and is part of the team
    const { data: targetMember, error: targetError } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        status,
        user_id,
        profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('id', memberId)
      .eq('team_id', teamId)
      .single()

    if (targetError || !targetMember) {
      return createApiErrorNextResponse('Team member not found', 404)
    }

    if (targetMember.status !== 'active') {
      return createApiErrorNextResponse('Member is not active', 400)
    }

    // Prevent user from removing themselves if they're the only admin
    if (targetMember.user_id === user.id && targetMember.role === 'admin') {
      const { data: adminCount, error: adminCountError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('role', 'admin')
        .eq('status', 'active')

      if (adminCountError || !adminCount || adminCount.length <= 1) {
        return createApiErrorNextResponse('Cannot remove yourself. Team must have at least one admin.', 400)
      }
    }

    // Remove member from team
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Error removing team member:', deleteError)
      return createApiErrorNextResponse('Failed to remove team member', 500)
    }

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]/members/[memberId]:', error)
    return handleError(error, 'Failed to remove team member')
  }
}
