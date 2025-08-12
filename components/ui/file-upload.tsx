'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { uploadFile, StorageBucket } from '@/lib/storage-client'

interface FileUploadProps {
  bucket: StorageBucket
  path: string
  onUploadComplete?: (url: string) => void
  onUploadError?: (error: string) => void
  accept?: string
  maxSize?: number // in MB
  className?: string
}

export function FileUpload({
  bucket,
  path,
  onUploadComplete,
  onUploadError,
  accept = "image/*",
  maxSize = 5,
  className = ""
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      onUploadError?.(`File size must be less than ${maxSize}MB`)
      return
    }

    setUploading(true)

    try {
      const { url, error } = await uploadFile(bucket, path, file)
      
      if (error) {
        onUploadError?.(error)
      } else if (url) {
        onUploadComplete?.(url)
      }
    } catch (error) {
      onUploadError?.('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'Uploading...' : 'Choose File'}
      </Button>
    </div>
  )
}