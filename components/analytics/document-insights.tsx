'use client'

import React from 'react'
import { useAnalytics } from '@/lib/contexts/analytics-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  HardDrive, 
  File,
  Calendar,
  Download
} from 'lucide-react'

interface DocumentInsightsProps {
  timeRange: string
}

export function DocumentInsights({ timeRange }: DocumentInsightsProps) {
  const { data, loading } = useAnalytics()

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || !data.documents) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            No document data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const { documents } = data

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatFileType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'application': 'Documents',
      'image': 'Images',
      'text': 'Text Files',
      'unknown': 'Other'
    }
    return typeMap[type] || type
  }

  const getFileTypeIcon = (type: string) => {
    if (type === 'application') return <FileText className="h-4 w-4 text-blue-500" />
    if (type === 'image') return <FileText className="h-4 w-4 text-green-500" />
    if (type === 'text') return <FileText className="h-4 w-4 text-orange-500" />
    return <File className="h-4 w-4 text-gray-500" />
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Document Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Document Statistics</span>
          </CardTitle>
          <CardDescription>
            Overview of your document activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Documents</div>
              <div className="text-2xl font-bold">{documents.totalDocuments}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Size</div>
              <div className="text-2xl font-bold">{formatBytes(documents.totalSize)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Average Size</div>
              <div className="text-2xl font-bold">{formatBytes(documents.averageSize)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">File Types</div>
              <div className="text-2xl font-bold">{Object.keys(documents.fileTypeBreakdown).length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDrive className="h-5 w-5" />
            <span>File Type Distribution</span>
          </CardTitle>
          <CardDescription>
            Breakdown of document types uploaded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(documents.fileTypeBreakdown).length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-4">
              No file type data available
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(documents.fileTypeBreakdown)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .map(([type, count]) => {
                  const percentage = documents.totalDocuments > 0 
                    ? Math.round((count as number / documents.totalDocuments) * 100)
                    : 0
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getFileTypeIcon(type)}
                        <span className="text-sm font-medium">
                          {formatFileType(type)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {count} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Documents */}
      {documents.mostRecentDocument && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>
              Your most recent document uploads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Most Recent Document */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="font-medium">{documents.mostRecentDocument.filename}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatBytes(documents.mostRecentDocument.file_size)} • 
                      {new Date(documents.mostRecentDocument.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary">Most Recent</Badge>
              </div>

              {/* Largest Document */}
              {documents.largestDocument && documents.largestDocument.id !== documents.mostRecentDocument.id && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="font-medium">{documents.largestDocument.filename}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatBytes(documents.largestDocument.file_size)} • 
                        {new Date(documents.largestDocument.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline">Largest</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
