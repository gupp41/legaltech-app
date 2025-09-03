import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createApiErrorNextResponse } from '@/lib/utils/error-handler'

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

    // Get all document shares for the team
    const { data: sharedDocuments, error: documentsError } = await supabase
      .from('team_document_shares')
      .select('*')
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

    // Get document details and user profiles
    let formattedDocuments = []
    if (activeDocuments.length > 0) {
      const documentIds = activeDocuments.map(share => share.document_id)
      const userIds = activeDocuments.map(share => share.shared_by)
      
      // Get documents
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('id, filename, file_type, file_size, created_at, updated_at, user_id')
        .in('id', documentIds)

      if (docsError) {
        console.error('Error fetching documents:', docsError)
        return createApiErrorNextResponse('Failed to fetch documents', 500)
      }

      // Get document owner profiles
      const documentOwnerIds = documents?.map(doc => doc.user_id) || []
      const { data: documentOwners, error: ownersError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', documentOwnerIds)

      if (ownersError) {
        console.error('Error fetching document owners:', ownersError)
        return createApiErrorNextResponse('Failed to fetch document owners', 500)
      }

      // Get shared by profiles
      const { data: sharedByProfiles, error: sharedByError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      if (sharedByError) {
        console.error('Error fetching shared by profiles:', sharedByError)
        return createApiErrorNextResponse('Failed to fetch shared by profiles', 500)
      }

      // Combine the data
      formattedDocuments = activeDocuments.map(share => {
        const document = documents?.find(doc => doc.id === share.document_id)
        const documentOwner = documentOwners?.find(owner => owner.id === document?.user_id)
        const sharedByProfile = sharedByProfiles?.find(profile => profile.id === share.shared_by)

        return {
          shareId: share.id,
          document: document ? {
            id: document.id,
            filename: document.filename,
            fileType: document.file_type,
            fileSize: document.file_size,
            createdAt: document.created_at,
            updatedAt: document.updated_at,
            owner: documentOwner ? {
              fullName: documentOwner.full_name,
              email: documentOwner.email
            } : {
              fullName: 'Unknown User',
              email: 'unknown@example.com'
            }
          } : null,
          accessLevel: share.access_level,
          expiresAt: share.expires_at,
          sharedBy: sharedByProfile ? {
            fullName: sharedByProfile.full_name,
            email: sharedByProfile.email
          } : {
            fullName: 'Unknown User',
            email: 'unknown@example.com'
          },
          sharedAt: share.created_at,
          isExpired: share.expires_at ? new Date(share.expires_at) < now : false
        }
      }).filter(item => item.document !== null) // Filter out shares with missing documents
    }

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
      totalCount: formattedDocuments.length
    })

  } catch (error) {
    console.error('Error in GET /api/teams/[id]/documents:', error)
    return createApiErrorNextResponse(error, 500, 'Failed to fetch team documents')
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
    return createApiErrorNextResponse(error, 500, 'Failed to share document with team')
  }
}
