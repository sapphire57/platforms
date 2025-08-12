import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { removeUserFromTenant } from '@/lib/models/tenant-users'

const removeUserSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  user_id: z.string().uuid('Invalid user ID')
})

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = removeUserSchema.parse(body)

    // Check permissions - only owners and managers can remove users
    const { data: tenantUser, error: permError } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', validatedData.tenant_id)
      .eq('user_id', currentUser.id)
      .single()

    if (permError || !tenantUser || !['owner', 'manager'].includes(tenantUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if target user is an owner
    const { data: targetUser } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', validatedData.tenant_id)
      .eq('user_id', validatedData.user_id)
      .single()

    if (targetUser?.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove owner from tenant' }, { status: 403 })
    }

    // Prevent users from removing themselves unless they're transferring ownership
    if (validatedData.user_id === currentUser.id) {
      return NextResponse.json({ error: 'Cannot remove yourself from tenant' }, { status: 403 })
    }

    // Remove user from tenant
    const success = await removeUserFromTenant(
      validatedData.tenant_id,
      validatedData.user_id
    )

    if (!success) {
      return NextResponse.json({ error: 'Failed to remove user from tenant' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User removed from tenant successfully'
    })

  } catch (error) {
    console.error('Error removing user from tenant:', error)
    
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