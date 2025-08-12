import { createClient as createServerClient } from '@/lib/supabase/server'

export type StorageBucket = 'tenant-assets' | 'user-avatars'

// Server-side storage operations
export async function uploadFileServer(
  bucket: StorageBucket,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createServerClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    return { url: null, error: error.message }
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return { url: publicUrl, error: null }
}

export async function deleteFileServer(
  bucket: StorageBucket,
  path: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServerClient()

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function getFileUrlServer(
  bucket: StorageBucket,
  path: string
): Promise<string> {
  const supabase = await createServerClient()

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

export async function listFilesServer(
  bucket: StorageBucket,
  folder?: string
): Promise<{ files: any[]; error: string | null }> {
  const supabase = await createServerClient()

  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder, {
      limit: 100,
      offset: 0
    })

  if (error) {
    return { files: [], error: error.message }
  }

  return { files: data, error: null }
}

// Helper functions for common operations
export function getTenantAssetPath(subdomain: string, filename: string): string {
  return `${subdomain}/${filename}`
}

export function getUserAvatarPath(userId: string, filename: string): string {
  return `${userId}/${filename}`
}

export async function uploadTenantAssetServer(
  subdomain: string,
  filename: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const path = getTenantAssetPath(subdomain, filename)
  return uploadFileServer('tenant-assets', path, file)
}

export async function uploadUserAvatarServer(
  userId: string,
  filename: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const path = getUserAvatarPath(userId, filename)
  return uploadFileServer('user-avatars', path, file)
}