import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'

type TenantUser = Database['public']['Tables']['tenant_users']['Row']
type TenantUserInsert = Database['public']['Tables']['tenant_users']['Insert']

export async function addUserToTenant(
  tenantId: string,
  userId: string,
  role: 'owner' | 'manager' | 'auditor' | 'observer' = 'observer',
  invitedBy?: string
): Promise<TenantUser | null> {
  const supabase = await createClient()
  
  const insertData: TenantUserInsert = {
    tenant_id: tenantId,
    user_id: userId,
    role,
    invited_by: invitedBy,
    invited_at: invitedBy ? new Date().toISOString() : null,
    joined_at: !invitedBy ? new Date().toISOString() : null
  }

  const { data, error } = await supabase
    .from('tenant_users')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error adding user to tenant:', error)
    return null
  }

  return data
}

export async function removeUserFromTenant(
  tenantId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('tenant_users')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error removing user from tenant:', error)
    return false
  }

  return true
}

export async function updateUserTenantRole(
  tenantId: string,
  userId: string,
  role: 'owner' | 'manager' | 'auditor' | 'observer'
): Promise<TenantUser | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenant_users')
    .update({ role })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating user tenant role:', error)
    return null
  }

  return data
}

export async function getTenantUsers(tenantId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenant_users')
    .select(`
      *,
      users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tenant users:', error)
    return []
  }

  return data
}

export async function acceptTenantInvitation(
  tenantId: string,
  userId: string
): Promise<TenantUser | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenant_users')
    .update({ joined_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .is('joined_at', null)
    .select()
    .single()

  if (error) {
    console.error('Error accepting tenant invitation:', error)
    return null
  }

  return data
}