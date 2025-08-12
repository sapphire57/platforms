import { createClient } from '@/lib/supabase/client'

export type StorageBucket = 'tenant-assets' | 'user-avatars'

export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const supabase = createClient()

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

export async function deleteFile(
  bucket: StorageBucket,
  path: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function getFileUrl(
  bucket: StorageBucket,
  path: string
): Promise<string> {
  const supabase = createClient()

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

export async function listFiles(
  bucket: StorageBucket,
  folder?: string
): Promise<{ files: any[]; error: string | null }> {
  const supabase = createClient()

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

export async function uploadTenantAsset(
  subdomain: string,
  filename: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const path = getTenantAssetPath(subdomain, filename)
  return uploadFile('tenant-assets', path, file)
}

export async function uploadUserAvatar(
  userId: string,
  filename: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const path = getUserAvatarPath(userId, filename)
  return uploadFile('user-avatars', path, file)
}