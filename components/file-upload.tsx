"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { cn, ensurePublicUrl } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { FileUploadProps } from '@/types/shared'
import { debug } from '@/lib/utils/debug'

// FileUploadProps interface is now imported from shared types

export function FileUpload({ onUploadComplete, className }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [documentType, setDocumentType] = useState("contract")
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setUploading(true)
      setUploadProgress(0)
      setUploadStatus("idle")
      setErrorMessage("")

              try {
          // Get current session token
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          
          if (!session) {
            throw new Error("No active session found")
          }
          
          // Simulate progress during API upload
          const progressInterval = setInterval(() => {
            setUploadProgress((prev) => Math.min(prev + 10, 90))
          }, 200)
          
          // Upload file using the API route (which includes usage tracking)
          const formData = new FormData()
          formData.append('file', file)
          formData.append('documentType', documentType || 'legal_document')
          
          console.log('Uploading via API route with file size:', file.size, 'bytes')
          console.log('Session token:', session.access_token ? 'Present' : 'Missing')
          
          const response = await fetch('/api/documents/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include', // Include cookies
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              // Don't set Content-Type for FormData, let the browser set it
            }
          })

          if (!response.ok) {
            let errorMessage = 'Upload failed'
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } catch (parseError) {
              // If JSON parsing fails, try to get text response
              try {
                const errorText = await response.text()
                console.error('Non-JSON error response:', errorText)
                errorMessage = `Upload failed: ${response.status} ${response.statusText}`
              } catch (textError) {
                console.error('Failed to parse error response:', textError)
                errorMessage = `Upload failed: ${response.status} ${response.statusText}`
              }
            }
            throw new Error(errorMessage)
          }

          const result = await response.json()
          console.log('API upload response:', result)
          
          clearInterval(progressInterval)
          setUploadProgress(100)
          
          setUploadStatus("success")
          onUploadComplete?.(result)
      } catch (error) {
        setUploadStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "Upload failed")
      } finally {
        setUploading(false)
        setTimeout(() => {
          setUploadProgress(0)
          setUploadStatus("idle")
        }, 3000)
      }
    },
    [documentType, onUploadComplete],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Upload Legal Document</h3>
            <Select value={documentType} onValueChange={setDocumentType} disabled={uploading}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="agreement">Agreement</SelectItem>
                <SelectItem value="policy">Policy</SelectItem>
                <SelectItem value="compliance">Compliance</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/10" : "border-border hover:border-border/80",
              uploading && "cursor-not-allowed opacity-50",
            )}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-4">
              {uploadStatus === "success" ? (
                <CheckCircle className="h-12 w-12 text-green-500" />
              ) : uploadStatus === "error" ? (
                <AlertCircle className="h-12 w-12 text-red-500" />
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground" />
              )}

              <div className="space-y-2">
                {uploadStatus === "success" ? (
                  <p className="text-green-600 font-medium">Upload successful!</p>
                ) : uploadStatus === "error" ? (
                  <div>
                    <p className="text-red-600 font-medium">Upload failed</p>
                    <p className="text-sm text-red-500">{errorMessage}</p>
                  </div>
                ) : uploading ? (
                  <p className="text-muted-foreground">Uploading document...</p>
                ) : isDragActive ? (
                  <p className="text-blue-600">Drop the file here</p>
                ) : (
                  <div>
                    <p className="text-muted-foreground">Drag & drop a legal document here, or click to select</p>
                    <p className="text-sm text-muted-foreground">Supports PDF, DOC, DOCX, and TXT files</p>
                  </div>
                )}
              </div>

              {!uploading && uploadStatus === "idle" && (
                <Button variant="outline" className="mt-2 bg-transparent">
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              )}
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{uploadProgress}% complete</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
