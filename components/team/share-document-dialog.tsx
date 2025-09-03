'use client'

import React, { useState, useEffect } from 'react'
import { useTeam } from '@/lib/contexts/team-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Share2, Eye, MessageSquare, Edit, FileText } from 'lucide-react'

interface Document {
  id: string
  filename: string
  fileType: string
  fileSize: number
  createdAt: string
  updatedAt: string
}

interface ShareDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ShareDocumentDialog({ open, onOpenChange }: ShareDocumentDialogProps) {
  const { currentTeam, shareDocument, loading } = useTeam()
  const [documents, setDocuments] = useState<Document[]>([])
  const [formData, setFormData] = useState({
    documentId: '',
    accessLevel: 'view' as 'view' | 'comment' | 'edit',
    expiresAt: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingDocuments, setLoadingDocuments] = useState(false)

  // Fetch user's documents
  useEffect(() => {
    if (open && currentTeam) {
      fetchDocuments()
    }
  }, [open, currentTeam])

  const fetchDocuments = async () => {
    try {
      setLoadingDocuments(true)
      const response = await fetch('/api/documents/list', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoadingDocuments(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.documentId || !currentTeam) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const expiresAt = formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined
      const success = await shareDocument(currentTeam.id, formData.documentId, formData.accessLevel, expiresAt)
      
      if (success) {
        // Reset form
        setFormData({ documentId: '', accessLevel: 'view', expiresAt: '' })
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error sharing document:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      onOpenChange(open)
      if (!open) {
        // Reset form when closing
        setFormData({ documentId: '', accessLevel: 'view', expiresAt: '' })
      }
    }
  }

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

  const getAccessDescription = (accessLevel: string) => {
    switch (accessLevel) {
      case 'view':
        return 'Team members can view the document but cannot make changes'
      case 'comment':
        return 'Team members can view and add comments to the document'
      case 'edit':
        return 'Team members can view, comment, and edit the document'
      default:
        return 'Team members can view the document but cannot make changes'
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Share2 className="h-5 w-5" />
            <span>Share Document with Team</span>
          </DialogTitle>
          <DialogDescription>
            Share a document with {currentTeam?.name || 'your team'} members.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="document">
                Select Document <span className="text-red-500">*</span>
              </Label>
              {loadingDocuments ? (
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Loading documents...</span>
                </div>
              ) : (
                <Select
                  value={formData.documentId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, documentId: value }))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a document to share" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.length === 0 ? (
                      <SelectItem value="" disabled>
                        No documents available
                      </SelectItem>
                    ) : (
                      documents.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          <div className="flex items-center space-x-2">
                            {getFileTypeIcon(doc.fileType)}
                            <div>
                              <div className="font-medium">{doc.filename}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="accessLevel">Access Level</Label>
              <Select
                value={formData.accessLevel}
                onValueChange={(value: 'view' | 'comment' | 'edit') => 
                  setFormData(prev => ({ ...prev, accessLevel: value }))
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center space-x-2">
                      {getAccessIcon('view')}
                      <div>
                        <div className="font-medium">View Only</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Can view but not edit</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="comment">
                    <div className="flex items-center space-x-2">
                      {getAccessIcon('comment')}
                      <div>
                        <div className="font-medium">Comment</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Can view and comment</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center space-x-2">
                      {getAccessIcon('edit')}
                      <div>
                        <div className="font-medium">Edit</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Can view, comment, and edit</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getAccessDescription(formData.accessLevel)}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Leave empty for no expiration. The document will be automatically unshared after this date.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.documentId || isSubmitting || loadingDocuments}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Document
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
