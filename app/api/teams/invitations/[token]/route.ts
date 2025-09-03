import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, createApiErrorNextResponse } from '@/lib/utils/error-handler'

/**
 * GET /api/teams/invitations/[token] - Get invitation details
 * Returns invitation details for a given token
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createClient()
    const { token } = await params

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        team_id,
        email,
        role,
        expires_at,
        created_at,
        accepted_at,
        teams (
          id,
          name,
          description
        ),
        profiles!team_invitations_invited_by_fkey (
          full_name,
          email
        )
      `)
      .eq('token', token)
      .single()

    if (invitationError || !invitation) {
      return createApiErrorNextResponse('Invalid or expired invitation', 404)
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return createApiErrorNextResponse('Invitation has expired', 410)
    }

    // Check if invitation is already accepted
    if (invitation.accepted_at) {
      return createApiErrorNextResponse('Invitation has already been accepted', 409)
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        team: {
          id: invitation.teams.id,
          name: invitation.teams.name,
          description: invitation.teams.description
        },
        email: invitation.email,
        role: invitation.role,
        invitedBy: {
          fullName: invitation.profiles.full_name,
          email: invitation.profiles.email
        },
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at
      }
    })

  } catch (error) {
    console.error('Error in GET /api/teams/invitations/[token]:', error)
    return handleError(error, 'Failed to fetch invitation details')
  }
}

/**
 * POST /api/teams/invitations/[token] - Accept team invitation
 * Accepts a team invitation and adds user to the team
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createClient()
    const { token } = await params

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorNextResponse('Unauthorized', 401)
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        team_id,
        email,
        role,
        expires_at,
        accepted_at,
        teams (
          id,
          name,
          description
        )
      `)
      .eq('token', token)
      .single()

    if (invitationError || !invitation) {
      return createApiErrorNextResponse('Invalid or expired invitation', 404)
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return createApiErrorNextResponse('Invitation has expired', 410)
    }

    // Check if invitation is already accepted
    if (invitation.accepted_at) {
      return createApiErrorNextResponse('Invitation has already been accepted', 409)
    }

    // Check if user's email matches invitation email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return createApiErrorNextResponse('This invitation is not for your email address', 403)
    }

    // Check if user is already a member of the team
    const { data: existingMember, error: memberError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', invitation.team_id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      if (existingMember.status === 'active') {
        return createApiErrorNextResponse('You are already a member of this team', 409)
      } else if (existingMember.status === 'pending') {
        return createApiErrorNextResponse('You already have a pending membership in this team', 409)
      }
    }

    // Start a transaction to accept invitation and add member
    const { data: newMember, error: memberCreateError } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: user.id, // The user who sent the invitation
        status: 'active',
        joined_at: new Date().toISOString()
      })
      .select(`
        id,
        role,
        status,
        joined_at,
        teams (
          id,
          name,
          description
        )
      `)
      .single()

    if (memberCreateError) {
      console.error('Error adding team member:', memberCreateError)
      return createApiErrorNextResponse('Failed to join team', 500)
    }

    // Mark invitation as accepted
    const { error: acceptError } = await supabase
      .from('team_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    if (acceptError) {
      console.error('Error accepting invitation:', acceptError)
      // Clean up the member if invitation update fails
      await supabase.from('team_members').delete().eq('id', newMember.id)
      return createApiErrorNextResponse('Failed to accept invitation', 500)
    }

    return NextResponse.json({
      success: true,
      member: {
        id: newMember.id,
        role: newMember.role,
        status: newMember.status,
        joinedAt: newMember.joined_at,
        team: {
          id: newMember.teams.id,
          name: newMember.teams.name,
          description: newMember.teams.description
        }
      },
      message: 'Successfully joined the team!'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/teams/invitations/[token]:', error)
    return handleError(error, 'Failed to accept team invitation')
  }
}

/**
 * DELETE /api/teams/invitations/[token] - Revoke team invitation
 * Revokes a team invitation (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const supabase = await createClient()
    const { token } = await params

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return createApiErrorNextResponse('Unauthorized', 401)
    }

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        team_id,
        invited_by
      `)
      .eq('token', token)
      .single()

    if (invitationError || !invitation) {
      return createApiErrorNextResponse('Invitation not found', 404)
    }

    // Check if user is an admin of the team or the one who sent the invitation
    const { data: membership, error: membershipError } = await supabase
      .from('team_members')
      .select('role, status')
      .eq('team_id', invitation.team_id)
      .eq('user_id', user.id)
      .single()

    const isAdmin = membership && membership.status === 'active' && membership.role === 'admin'
    const isInviter = invitation.invited_by === user.id

    if (!isAdmin && !isInviter) {
      return createApiErrorNextResponse('Access denied. Admin role or invitation sender required.', 403)
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitation.id)

    if (deleteError) {
      console.error('Error revoking invitation:', deleteError)
      return createApiErrorNextResponse('Failed to revoke invitation', 500)
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/teams/invitations/[token]:', error)
    return handleError(error, 'Failed to revoke invitation')
  }
}
