import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { updateUserTenantRole } from '@/lib/models/tenant-users'

const updateRoleSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  user_id: z.string().uuid('Invalid user ID'),
  role: z.enum(['observer', 'auditor', 'manager', 'owner'])
})

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateRoleSchema.parse(body)

    // Check permissions - only owners and managers can update roles
    const { data: tenantUser, error: permError } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', validatedData.tenant_id)
      .eq('user_id', currentUser.id)
      .single()

    if (permError || !tenantUser || !['owner', 'manager'].includes(tenantUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Additional check: only owners can assign owner role or modify owner roles
    if (validatedData.role === 'owner' && tenantUser.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can assign owner role' }, { status: 403 })
    }

    // Check if target user is an owner and current user is not owner
    const { data: targetUser } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', validatedData.tenant_id)
      .eq('user_id', validatedData.user_id)
      .single()

    if (targetUser?.role === 'owner' && tenantUser.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can modify owner roles' }, { status: 403 })
    }

    // Update the role
    const updatedUser = await updateUserTenantRole(
      validatedData.tenant_id,
      validatedData.user_id,
      validatedData.role
    )

    if (!updatedUser) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Role updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Error updating user role:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}