import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { UserRole } from '@/lib/models/permissions'
import { addUserToTenant } from '@/lib/models/tenant-users'

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(1, 'Full name is required'),
  tenant_id: z.string().uuid('Invalid tenant ID'),
  role: z.enum(['observer', 'auditor', 'manager', 'owner']),
  send_invitation: z.boolean().default(true),
  temporary_password: z.string().min(8, 'Password must be at least 8 characters').optional()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if current user is authenticated and has permission
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

    // Check if current user has permission to create users in this tenant
    const { data: tenantUser, error: permError } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', validatedData.tenant_id)
      .eq('user_id', currentUser.id)
      .single()

    if (permError || !tenantUser || !['owner', 'manager'].includes(tenantUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', validatedData.email)
      .single()

    if (existingUser) {
      // User exists, just add them to the tenant
      const tenantUserResult = await addUserToTenant(
        validatedData.tenant_id,
        existingUser.id,
        validatedData.role,
        currentUser.id
      )

      if (!tenantUserResult) {
        return NextResponse.json({ error: 'Failed to add user to tenant' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Existing user added to tenant',
        user_id: existingUser.id,
        tenant_user_id: tenantUserResult.id
      })
    }

    // Create new user via Supabase Admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.temporary_password || generateRandomPassword(),
      email_confirm: !validatedData.send_invitation, // Auto-confirm if not sending invitation
      user_metadata: {
        full_name: validatedData.full_name
      }
    })

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError)
      return NextResponse.json({ 
        error: createError?.message || 'Failed to create user' 
      }, { status: 500 })
    }

    // The user profile will be created automatically via the trigger
    // Add user to tenant with specified role
    const tenantUserResult = await addUserToTenant(
      validatedData.tenant_id,
      newUser.user.id,
      validatedData.role,
      currentUser.id
    )

    if (!tenantUserResult) {
      // Clean up the created user if tenant assignment fails
      await supabase.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: 'Failed to assign user to tenant' }, { status: 500 })
    }

    // Send invitation email if requested
    if (validatedData.send_invitation) {
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        validatedData.email,
        {
          data: {
            full_name: validatedData.full_name,
            tenant_id: validatedData.tenant_id,
            role: validatedData.role
          },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
        }
      )

      if (inviteError) {
        console.error('Error sending invitation:', inviteError)
        // Don't fail the whole operation if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name: validatedData.full_name
      },
      tenant_user: {
        id: tenantUserResult.id,
        role: validatedData.role,
        tenant_id: validatedData.tenant_id
      },
      invitation_sent: validatedData.send_invitation
    })

  } catch (error) {
    console.error('Error in user creation API:', error)
    
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

function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// GET endpoint to fetch users in a tenant
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    // Check authentication and permissions
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this tenant
    const { data: tenantUser, error: permError } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', currentUser.id)
      .single()

    if (permError || !tenantUser) {
      console.error('Permission check failed:', { permError, tenantUser, currentUser: currentUser.id, tenantId })
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch tenant users
    const { data: users, error } = await supabase
      .from('tenant_users')
      .select(`
        *,
        users (
          id,
          email,
          full_name,
          avatar_url,
          created_at
        )
      `)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}