import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleError, createApiErrorNextResponse } from '@/lib/utils/error-handler'

/**
 * GET /api/teams/[id]/documents - Get team documents
 * Returns all documents shared with the team
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

    // Get all documents shared with the team
    const { data: sharedDocuments, error: documentsError } = await supabase
      .from('team_document_shares')
      .select(`
        id,
        document_id,
        access_level,
        expires_at,
        created_at,
        updated_at,
        documents (
          id,
          filename,
          file_type,
          file_size,
          created_at,
          updated_at,
          profiles!documents_user_id_fkey (
            full_name,
            email
          )
        ),
        profiles!team_document_shares_shared_by_fkey (
          full_name,
          email
        )
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error fetching team documents:', documentsError)
      return createApiErrorNextResponse('Failed to fetch team documents', 500)
    }

    // Filter out expired documents
    const now = new Date()
    const activeDocuments = sharedDocuments?.filter(share => 
      !share.expires_at || new Date(share.expires_at) > now
    ) || []

    // Format response
    const formattedDocuments = activeDocuments.map(share => ({
      shareId: share.id,
      document: {
        id: share.documents.id,
        filename: share.documents.filename,
        fileType: share.documents.file_type,
        fileSize: share.documents.file_size,
        createdAt: share.documents.created_at,
        updatedAt: share.documents.updated_at,
        owner: {
          fullName: share.documents.profiles.full_name,
          email: share.documents.profiles.email
        }
      },
      accessLevel: share.access_level,
      expiresAt: share.expires_at,
      sharedBy: {
        fullName: share.profiles.full_name,
        email: share.profiles.email
      },
      sharedAt: share.created_at,
      isExpired: share.expires_at ? new Date(share.expires_at) < now : false
    }))

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
      totalCount: formattedDocuments.length
    })

  } catch (error) {
    console.error('Error in GET /api/teams/[id]/documents:', error)
    return handleError(error, 'Failed to fetch team documents')
  }
}

/**
 * POST /api/teams/[id]/documents - Share document with team
 * Shares a document with the team (member with appropriate permissions)
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
    const { documentId, accessLevel = 'view', expiresAt } = body

    // Validate required fields
    if (!documentId || typeof documentId !== 'string') {
      return createApiErrorNextResponse('Document ID is required', 400)
    }

    if (!['view', 'comment', 'edit'].includes(accessLevel)) {
      return createApiErrorNextResponse('Invalid access level. Must be view, comment, or edit.', 400)
    }

    // Validate expiration date if provided
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return createApiErrorNextResponse('Expiration date must be in the future', 400)
    }

    // Check if document exists and user has access to it
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select(`
        id,
        filename,
        file_type,
        file_size,
        user_id,
        team_id,
        is_team_document
      `)
      .eq('id', documentId)
      .single()

    if (documentError || !document) {
      return createApiErrorNextResponse('Document not found', 404)
    }

    // Check if user owns the document or has team access
    const isOwner = document.user_id === user.id
    const isTeamDocument = document.team_id === teamId

    if (!isOwner && !isTeamDocument) {
      return createApiErrorNextResponse('Access denied. You can only share documents you own or have team access to.', 403)
    }

    // Check if document is already shared with this team
    const { data: existingShare, error: shareError } = await supabase
      .from('team_document_shares')
      .select('id')
      .eq('document_id', documentId)
      .eq('team_id', teamId)
      .single()

    if (existingShare) {
      return createApiErrorNextResponse('Document is already shared with this team', 409)
    }

    // Share document with team
    const { data: newShare, error: createError } = await supabase
      .from('team_document_shares')
      .insert({
        document_id: documentId,
        team_id: teamId,
        shared_by: user.id,
        access_level: accessLevel,
        expires_at: expiresAt || null
      })
      .select(`
        id,
        access_level,
        expires_at,
        created_at,
        documents (
          id,
          filename,
          file_type,
          file_size
        )
      `)
      .single()

    if (createError) {
      console.error('Error sharing document with team:', createError)
      return createApiErrorNextResponse('Failed to share document with team', 500)
    }

    return NextResponse.json({
      success: true,
      share: {
        id: newShare.id,
        document: {
          id: newShare.documents.id,
          filename: newShare.documents.filename,
          fileType: newShare.documents.file_type,
          fileSize: newShare.documents.file_size
        },
        accessLevel: newShare.access_level,
        expiresAt: newShare.expires_at,
        sharedAt: newShare.created_at
      },
      message: 'Document shared with team successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/teams/[id]/documents:', error)
    return handleError(error, 'Failed to share document with team')
  }
}
