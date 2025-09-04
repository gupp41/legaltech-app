'use client'

import React, { useState } from 'react'
import { useTeam } from '@/lib/contexts/team-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  FileText, 
  Share2, 
  MoreVertical, 
  Eye,
  MessageSquare,
  Edit,
  Calendar,
  User,
  Clock,
  Trash2,
  Settings
} from 'lucide-react'
import { ShareDocumentDialog } from './share-document-dialog'

export function TeamDocumentsList() {
  const { currentTeam, teamDocuments, removeDocumentShare, updateDocumentShare, loading } = useTeam()
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const getAccessIcon = (accessLevel: string) => {
    switch (accessLevel) {
      case 'view':
        return <Eye className="h-4 w-4 text-gray-500" />
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case 'edit':
        return <Edit className="h-4 w-4 text-green-500" />
      default:
        return <Eye className="h-4 w-4 text-gray-500" />
    }
  }

  const getAccessLabel = (accessLevel: string) => {
    switch (accessLevel) {
      case 'view':
        return 'View Only'
      case 'comment':
        return 'Comment'
      case 'edit':
        return 'Edit'
      default:
        return 'View Only'
    }
  }

  const getAccessBadgeVariant = (accessLevel: string) => {
    switch (accessLevel) {
      case 'view':
        return 'outline' as const
      case 'comment':
        return 'secondary' as const
      case 'edit':
        return 'default' as const
      default:
        return 'outline' as const
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) {
      return <FileText className="h-4 w-4 text-red-500" />
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="h-4 w-4 text-blue-500" />
    } else {
      return <FileText className="h-4 w-4 text-gray-500" />
    }
  }

  const handleAccessChange = async (shareId: string, newAccessLevel: 'view' | 'comment' | 'edit') => {
    if (!currentTeam) return

    setActionLoading(shareId)
    try {
      await updateDocumentShare(currentTeam.id, shareId, newAccessLevel)
    } catch (error) {
      console.error('Error updating document access:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    if (!currentTeam) return

    if (!confirm('Are you sure you want to remove this document from the team?')) {
      return
    }

    setActionLoading(shareId)
    try {
      await removeDocumentShare(currentTeam.id, shareId)
    } catch (error) {
      console.error('Error removing document share:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const canManageDocuments = currentTeam?.role === 'admin' || currentTeam?.role === 'member'
  const activeDocuments = teamDocuments.filter(doc => !doc.isExpired)
  const expiredDocuments = teamDocuments.filter(doc => doc.isExpired)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Shared Documents</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Shared Documents</span>
              </CardTitle>
              <CardDescription>
                {activeDocuments.length} document{activeDocuments.length !== 1 ? 's' : ''} shared with the team
              </CardDescription>
            </div>
            {canManageDocuments && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowShareDialog(true)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Document
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activeDocuments.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Shared Documents</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Share documents with your team to start collaborating.
              </p>
              {canManageDocuments && (
                <Button onClick={() => setShowShareDialog(true)}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share First Document
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeDocuments.map((doc) => (
                <div
                  key={doc.shareId}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                    {getFileTypeIcon(doc.document.fileType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {doc.document.filename}
                      </h4>
                      <Badge variant={getAccessBadgeVariant(doc.accessLevel)} className="flex items-center space-x-1">
                        {getAccessIcon(doc.accessLevel)}
                        <span>{getAccessLabel(doc.accessLevel)}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <div className="flex items-center space-x-1">
                        <span>{formatFileSize(doc.document.fileSize)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>By {doc.document.owner.fullName || doc.document.owner.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Shared {new Date(doc.sharedAt).toLocaleDateString()}</span>
                      </div>
                      {doc.expiresAt && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Expires {new Date(doc.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {canManageDocuments && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={actionLoading === doc.shareId}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleAccessChange(doc.shareId, 'view')}
                          disabled={doc.accessLevel === 'view' || actionLoading === doc.shareId}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Only
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAccessChange(doc.shareId, 'comment')}
                          disabled={doc.accessLevel === 'comment' || actionLoading === doc.shareId}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Comment
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAccessChange(doc.shareId, 'edit')}
                          disabled={doc.accessLevel === 'edit' || actionLoading === doc.shareId}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveShare(doc.shareId)}
                          disabled={actionLoading === doc.shareId}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Share
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}

          {expiredDocuments.length > 0 && (
            <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Expired Shares</h4>
              <Badge variant="outline" className="text-xs">
                {expiredDocuments.length} expired
              </Badge>
            </div>
              <div className="space-y-2">
                {expiredDocuments.slice(0, 3).map((doc) => (
                  <div
                    key={doc.shareId}
                    className="flex items-center space-x-3 p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center">
                      {getFileTypeIcon(doc.document.fileType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                          {doc.document.filename}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {getAccessLabel(doc.accessLevel)}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Expired {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                ))}
                {expiredDocuments.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                    +{expiredDocuments.length - 3} more expired shares
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ShareDocumentDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
      />
    </>
  )
}
