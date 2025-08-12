import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'

type PermissionLevel = Database['public']['Tables']['permission_levels']['Row']
type UserPermission = Database['public']['Tables']['user_permissions']['Row']
type UserPermissionInsert = Database['public']['Tables']['user_permissions']['Insert']

export async function getPermissionLevels(): Promise<PermissionLevel[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('permission_levels')
    .select('*')
    .order('level', { ascending: true })

  if (error) {
    console.error('Error fetching permission levels:', error)
    return []
  }

  return data || []
}

export async function getUserPermissions(
  userId: string,
  tenantId: string
): Promise<UserPermission[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_permissions')
    .select(`
      *,
      permission_levels (
        id,
        name,
        description,
        level
      )
    `)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('Error fetching user permissions:', error)
    return []
  }

  return data || []
}

export async function grantUserPermission(
  userId: string,
  tenantId: string,
  permissionLevelId: string,
  grantedBy?: string
): Promise<UserPermission | null> {
  const supabase = await createClient()
  
  const insertData: UserPermissionInsert = {
    user_id: userId,
    tenant_id: tenantId,
    permission_level_id: permissionLevelId,
    granted_by: grantedBy
  }

  const { data, error } = await supabase
    .from('user_permissions')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error granting user permission:', error)
    return null
  }

  return data
}

export async function revokeUserPermission(
  userId: string,
  tenantId: string,
  permissionLevelId: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('permission_level_id', permissionLevelId)

  if (error) {
    console.error('Error revoking user permission:', error)
    return false
  }

  return true
}

export async function checkUserPermission(
  tenantId: string,
  permissionName: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('user_has_specific_permission', {
      tenant_id_param: tenantId,
      permission_name: permissionName
    })

  if (error) {
    console.error('Error checking user permission:', error)
    return false
  }

  return data || false
}

export async function getUserMaxPermissionLevel(
  userId: string,
  tenantId: string
): Promise<number> {
  const supabase = await createClient()
  
  // Get explicit permissions
  const { data: permissions } = await supabase
    .from('user_permissions')
    .select(`
      permission_levels (level)
    `)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  let maxLevel = 0
  if (permissions && permissions.length > 0) {
    maxLevel = Math.max(...permissions.map(p => (p.permission_levels as any)?.level || 0))
  }

  // Check role-based permissions if no explicit permissions
  if (maxLevel === 0) {
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (tenantUser) {
      const rolePermissions: Record<string, number> = {
        'owner': 5,
        'manager': 4,
        'auditor': 2,
        'observer': 1
      }
      maxLevel = rolePermissions[tenantUser.role as string] || 0
    }
  }

  return maxLevel
}

// Re-export types and utilities from the types file
export type { UserRole, PermissionLevelName } from '@/lib/types/permissions'
export { PERMISSION_LEVELS, getRolePermissionLevel, roleCanPerform } from '@/lib/types/permissions'