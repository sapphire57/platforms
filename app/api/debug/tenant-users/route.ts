import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', authError }, { status: 401 })
    }

    console.log('Debug - Current user:', user.id)
    console.log('Debug - Tenant ID:', tenantId)

    // Check if tenant exists
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    console.log('Debug - Tenant:', tenant, tenantError)

    // Check all tenant_users for this user
    const { data: allUserTenants, error: allUserTenantsError } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('user_id', user.id)

    console.log('Debug - User tenants:', allUserTenants, allUserTenantsError)

    // Check all tenant_users for this tenant
    const { data: allTenantUsers, error: allTenantUsersError } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)

    console.log('Debug - Tenant users:', allTenantUsers, allTenantUsersError)

    // Check specific user-tenant relationship
    const { data: specificRelation, error: specificError } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single()

    console.log('Debug - Specific relation:', specificRelation, specificError)

    return NextResponse.json({
      user: { id: user.id, email: user.email },
      tenant,
      tenantError,
      allUserTenants,
      allUserTenantsError,
      allTenantUsers,
      allTenantUsersError,
      specificRelation,
      specificError
    })

  } catch (error) {
    console.error('Debug API error:', error)
    return NextResponse.json({ error: 'Debug failed', details: error }, { status: 500 })
  }
}