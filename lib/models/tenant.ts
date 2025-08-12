import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/database.types'
import { validateSubdomain, validateTenantName, validateEmoji } from '@/lib/validation'

type Tenant = Database['public']['Tables']['tenants']['Row']
type TenantInsert = Database['public']['Tables']['tenants']['Insert']
type TenantUpdate = Database['public']['Tables']['tenants']['Update']

export async function getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
  if (!subdomain?.trim()) {
    throw new Error('Subdomain is required')
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain.toLowerCase())
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return null
    }
    console.error('Error fetching tenant:', error)
    throw new Error(`Failed to fetch tenant: ${error.message}`)
  }

  return data
}

export async function getUserTenants(userId: string): Promise<Tenant[]> {
  if (!userId?.trim()) {
    throw new Error('User ID is required')
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select(`
      *,
      tenant_users!inner(role)
    `)
    .eq('tenant_users.user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user tenants:', error)
    throw new Error(`Failed to fetch user tenants: ${error.message}`)
  }

  return data || []
}

export async function createTenant(tenantData: {
  name: string
  subdomain: string
  emoji: string
}): Promise<string | null> {
  // Validate all inputs
  const nameValidation = validateTenantName(tenantData.name);
  if (!nameValidation.isValid) {
    throw new Error(nameValidation.error);
  }

  const subdomainValidation = validateSubdomain(tenantData.subdomain);
  if (!subdomainValidation.isValid) {
    throw new Error(subdomainValidation.error);
  }

  const emojiValidation = validateEmoji(tenantData.emoji);
  if (!emojiValidation.isValid) {
    throw new Error(emojiValidation.error);
  }

  const supabase = await createClient()
  
  // Use the stored function to create tenant with owner relationship
  const { data, error } = await supabase
    .rpc('create_tenant_with_owner', {
      tenant_name: tenantData.name,
      tenant_subdomain: tenantData.subdomain.toLowerCase(),
      tenant_emoji: tenantData.emoji
    })

  if (error) {
    console.error('Error creating tenant:', error)
    throw new Error(`Failed to create tenant: ${error.message}`)
  }

  return data
}

export async function updateTenant(
  tenantId: string,
  updates: TenantUpdate
): Promise<Tenant | null> {
  if (!tenantId?.trim()) {
    throw new Error('Tenant ID is required')
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('Updates are required')
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)
    .select()
    .single()

  if (error) {
    console.error('Error updating tenant:', error)
    throw new Error(`Failed to update tenant: ${error.message}`)
  }

  return data
}

export async function deleteTenant(tenantId: string): Promise<boolean> {
  if (!tenantId?.trim()) {
    throw new Error('Tenant ID is required')
  }

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', tenantId)

  if (error) {
    console.error('Error deleting tenant:', error)
    throw new Error(`Failed to delete tenant: ${error.message}`)
  }

  return true
}

export async function getAllTenants(): Promise<Tenant[]> {
  const supabase = await createClient()
  
  // Check if user can access admin functions
  const { data: canAccess, error: authError } = await supabase
    .rpc('can_access_admin')
  
  if (authError || !canAccess) {
    throw new Error('Unauthorized: Admin access required')
  }
  
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all tenants:', error)
    throw new Error(`Failed to fetch tenants: ${error.message}`)
  }

  return data || []
}

export async function isSystemAdmin(): Promise<boolean> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .rpc('is_user_system_admin')
  
  if (error) {
    console.error('Error checking system admin status:', error)
    return false
  }
  
  return data || false
}