import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, createApiErrorNextResponse } from '@/lib/utils/error-handler'

/**
 * PUT /api/teams/[id]/documents/[shareId] - Update document share settings
 * Updates access level or expiration for a shared document
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId, shareId } = await params

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

    // Parse request body
    const body = await request.json()
    const { accessLevel, expiresAt } = body

    // Validate access level if provided
    if (accessLevel && !['view', 'comment', 'edit'].includes(accessLevel)) {
      return createApiErrorNextResponse('Invalid access level. Must be view, comment, or edit.', 400)
    }

    // Validate expiration date if provided
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return createApiErrorNextResponse('Expiration date must be in the future', 400)
    }

    // Check if document share exists and get details
    const { data: share, error: shareError } = await supabase
      .from('team_document_shares')
      .select(`
        id,
        document_id,
        shared_by,
        access_level,
        expires_at,
        documents (
          id,
          filename,
          user_id
        )
      `)
      .eq('id', shareId)
      .eq('team_id', teamId)
      .single()

    if (shareError || !share) {
      return createApiErrorNextResponse('Document share not found', 404)
    }

    // Check if user has permission to update this share
    // User can update if they are:
    // 1. The one who shared the document
    // 2. The owner of the document
    // 3. An admin of the team
    const isSharedBy = share.shared_by === user.id
    const isDocumentOwner = share.documents.user_id === user.id
    const isAdmin = membership.role === 'admin'

    if (!isSharedBy && !isDocumentOwner && !isAdmin) {
      return createApiErrorNextResponse('Access denied. You can only update shares you created, own, or as an admin.', 403)
    }

    // Prepare update data
    const updateData: any = {}
    if (accessLevel) updateData.access_level = accessLevel
    if (expiresAt !== undefined) updateData.expires_at = expiresAt
    updateData.updated_at = new Date().toISOString()

    // Update document share
    const { data: updatedShare, error: updateError } = await supabase
      .from('team_document_shares')
      .update(updateData)
      .eq('id', shareId)
      .select(`
        id,
        access_level,
        expires_at,
        updated_at,
        documents (
          id,
          filename,
          file_type,
          file_size
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating document share:', updateError)
      return createApiErrorNextResponse('Failed to update document share', 500)
    }

    return NextResponse.json({
      success: true,
      share: {
        id: updatedShare.id,
        document: {
          id: updatedShare.documents.id,
          filename: updatedShare.documents.filename,
          fileType: updatedShare.documents.file_type,
          fileSize: updatedShare.documents.file_size
        },
        accessLevel: updatedShare.access_level,
        expiresAt: updatedShare.expires_at,
        updatedAt: updatedShare.updated_at
      },
      message: 'Document share updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/teams/[id]/documents/[shareId]:', error)
    return handleError(error, 'Failed to update document share')
  }
}

/**
 * DELETE /api/teams/[id]/documents/[shareId] - Remove document share
 * Removes a document from team sharing
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId, shareId } = await params

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

    // Check if document share exists and get details
    const { data: share, error: shareError } = await supabase
      .from('team_document_shares')
      .select(`
        id,
        document_id,
        shared_by,
        documents (
          id,
          filename,
          user_id
        )
      `)
      .eq('id', shareId)
      .eq('team_id', teamId)
      .single()

    if (shareError || !share) {
      return createApiErrorNextResponse('Document share not found', 404)
    }

    // Check if user has permission to remove this share
    // User can remove if they are:
    // 1. The one who shared the document
    // 2. The owner of the document
    // 3. An admin of the team
    const isSharedBy = share.shared_by === user.id
    const isDocumentOwner = share.documents.user_id === user.id
    const isAdmin = membership.role === 'admin'

    if (!isSharedBy && !isDocumentOwner && !isAdmin) {
      return createApiErrorNextResponse('Access denied. You can only remove shares you created, own, or as an admin.', 403)
    }

    // Remove document share
    const { error: deleteError } = await supabase
      .from('team_document_shares')
      .delete()
      .eq('id', shareId)

    if (deleteError) {
      console.error('Error removing document share:', deleteError)
      return createApiErrorNextResponse('Failed to remove document share', 500)
    }

    return NextResponse.json({
      success: true,
      message: 'Document share removed successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/teams/[id]/documents/[shareId]:', error)
    return handleError(error, 'Failed to remove document share')
  }
}
