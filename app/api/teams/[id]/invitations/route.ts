import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createApiErrorNextResponse } from '@/lib/utils/error-handler'
import { emailService } from '@/lib/email-service'

/**
 * GET /api/teams/[id]/invitations - Get team invitations
 * Returns all pending invitations for a team (admin only)
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

    // Get all pending invitations for the team
    const { data: invitations, error: invitationsError } = await supabase
      .from('team_invitations')
      .select(`
        id,
        email,
        role,
        invited_by,
        token,
        expires_at,
        created_at,
        profiles!team_invitations_invited_by_fkey (
          full_name,
          email
        )
      `)
      .eq('team_id', teamId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (invitationsError) {
      console.error('Error fetching team invitations:', invitationsError)
      return createApiErrorNextResponse('Failed to fetch team invitations', 500)
    }

    // Format response
    const formattedInvitations = invitations?.map(invitation => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      invitedBy: {
        fullName: invitation.profiles.full_name,
        email: invitation.profiles.email
      },
      expiresAt: invitation.expires_at,
      createdAt: invitation.created_at,
      isExpired: new Date(invitation.expires_at) < new Date()
    })) || []

    return NextResponse.json({
      success: true,
      invitations: formattedInvitations,
      totalCount: formattedInvitations.length
    })

  } catch (error) {
    console.error('Error in GET /api/teams/[id]/invitations:', error)
    return createApiErrorNextResponse(error, 500, 'Failed to fetch team invitations')
  }
}

/**
 * POST /api/teams/[id]/invitations - Send team invitation
 * Sends an invitation to join the team (admin only)
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
    const { email, role = 'member' } = body

    // Validate required fields
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return createApiErrorNextResponse('Valid email address is required', 400)
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return createApiErrorNextResponse('Invalid role. Must be admin, member, or viewer.', 400)
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
      .from('team_members')
      .select('id, status')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (existingMember && existingMember.status === 'active') {
      return createApiErrorNextResponse('User is already a member of this team', 409)
    }

    // Check if there's already a pending invitation
    const { data: existingInvitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select('id, expires_at')
      .eq('team_id', teamId)
      .eq('email', email.toLowerCase())
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvitation) {
      return createApiErrorNextResponse('User already has a pending invitation to this team', 409)
    }

    // Generate invitation token
    const token = generateInvitationToken()

    // Set expiration date (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const { data: invitation, error: createError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id,
        token: token,
        expires_at: expiresAt.toISOString()
      })
      .select(`
        id,
        email,
        role,
        token,
        expires_at,
        created_at
      `)
      .single()

    if (createError) {
      console.error('Error creating team invitation:', createError)
      return createApiErrorNextResponse('Failed to create team invitation', 500)
    }

    // Send email invitation
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL}/teams/invite/${token}`
    
    // Get inviter's name for the email
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const inviterName = inviterProfile?.full_name || 'A team member'
    
    // Get team name for the email
    const { data: teamData } = await supabase
      .from('teams')
      .select('name')
      .eq('id', teamId)
      .single()

    const teamName = teamData?.name || 'the team'

    // Send email invitation
    const emailResult = await emailService.sendTeamInvitation({
      recipientEmail: email,
      inviterName: inviterName,
      teamName: teamName,
      invitationLink: invitationLink,
      expiresAt: invitation.expires_at
    })

    if (!emailResult.success) {
      console.warn('Failed to send email invitation:', emailResult.error)
      // Don't fail the request if email fails, just log it
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expires_at,
        createdAt: invitation.created_at,
        invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/teams/invite/${token}`
      },
      message: 'Team invitation sent successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/teams/[id]/invitations:', error)
    return createApiErrorNextResponse(error, 500, 'Failed to send team invitation')
  }
}

/**
 * Generate a secure invitation token
 */
function generateInvitationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
