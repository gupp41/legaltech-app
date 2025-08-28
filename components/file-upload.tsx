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

interface FileUploadProps {
  onUploadComplete?: (file: any) => void
  className?: string
}

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
        const supabase = createClient()
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          throw new Error("User not authenticated")
        }

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90))
        }, 200)

        // Upload file to Supabase Storage
        const fileName = `${user.id}/${Date.now()}-${file.name}`
        console.log('Attempting to upload with filename:', fileName)
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file)

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        // Use the actual path from the upload response to ensure accuracy
        // uploadData.path should contain the exact path used in storage
        const actualStoragePath = uploadData.path || fileName
        console.log('Upload successful, actual storage path:', actualStoragePath)
        console.log('Original filename vs actual path:', { fileName, actualStoragePath })
        console.log('Full upload response:', uploadData)
        
        // Store the storage path (not public URL) for secure access
        const storagePath = actualStoragePath
        console.log('Storage path stored (not public URL):', storagePath)
        
        // Note: We no longer use getPublicUrl() - files are private
        // Access will be controlled via signed URLs in the API
        
        // Double-check: verify the file actually exists at this path
        try {
          const { data: fileCheck, error: checkError } = await supabase.storage
            .from('documents')
            .list(actualStoragePath.split('/').slice(0, -1).join('/'))
          
          if (checkError) {
            console.warn('Could not verify file existence:', checkError)
          } else {
            const fileNameOnly = actualStoragePath.split('/').pop()
            const fileExists = fileCheck.some(f => f.name === fileNameOnly)
            console.log('File existence check:', { fileNameOnly, fileExists, availableFiles: fileCheck.map(f => f.name) })
          }
        } catch (checkError) {
          console.warn('File existence check failed:', checkError)
        }

        // Store document metadata in database
        const { data: document, error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: user.id,
            filename: file.name,
            original_filename: file.name,
            file_size: file.size,
            file_type: file.type,
            storage_path: storagePath,
            upload_status: "completed",
          })
          .select()
          .single()

        if (dbError) {
          throw new Error(dbError.message)
        }

        clearInterval(progressInterval)
        setUploadProgress(100)

        const result = {
          id: document.id,
          url: storagePath, // This is now the storage path, not a public URL
          filename: file.name,
          size: file.size,
          type: file.type,
          storage_path: storagePath,
        }

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
            <h3 className="text-lg font-semibold text-slate-900">Upload Legal Document</h3>
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
              isDragActive ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-slate-400",
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
                <Upload className="h-12 w-12 text-slate-400" />
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
                  <p className="text-slate-600">Uploading document...</p>
                ) : isDragActive ? (
                  <p className="text-blue-600">Drop the file here</p>
                ) : (
                  <div>
                    <p className="text-slate-600">Drag & drop a legal document here, or click to select</p>
                    <p className="text-sm text-slate-500">Supports PDF, DOC, DOCX, and TXT files</p>
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
              <p className="text-sm text-slate-500 text-center">{uploadProgress}% complete</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
