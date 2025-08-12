import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { UserRole } from '@/lib/models/permissions'
import { addUserToTenant } from '@/lib/models/tenant-users'

const bulkCreateUserSchema = z.object({
  tenant_id: z.string().uuid('Invalid tenant ID'),
  users: z.array(z.object({
    email: z.string().email('Invalid email address'),
    full_name: z.string().min(1, 'Full name is required'),
    role: z.enum(['observer', 'auditor', 'manager', 'owner']),
    temporary_password: z.string().min(8, 'Password must be at least 8 characters').optional()
  })).min(1, 'At least one user is required').max(50, 'Maximum 50 users per batch'),
  send_invitations: z.boolean().default(true)
})

interface CreateUserResult {
  email: string
  success: boolean
  user_id?: string
  tenant_user_id?: string
  error?: string
  action?: 'created' | 'added_existing' | 'already_member'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
    if (authError || !currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = bulkCreateUserSchema.parse(body)

    // Check permissions
    const { data: tenantUser, error: permError } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', validatedData.tenant_id)
      .eq('user_id', currentUser.id)
      .single()

    if (permError || !tenantUser || !['owner', 'manager'].includes(tenantUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const results: CreateUserResult[] = []
    const errors: string[] = []

    // Process each user
    for (const userData of validatedData.users) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', userData.email)
          .single()

        if (existingUser) {
          // Check if already a member of this tenant
          const { data: existingMember } = await supabase
            .from('tenant_users')
            .select('id, role')
            .eq('tenant_id', validatedData.tenant_id)
            .eq('user_id', existingUser.id)
            .single()

          if (existingMember) {
            results.push({
              email: userData.email,
              success: true,
              user_id: existingUser.id,
              tenant_user_id: existingMember.id,
              action: 'already_member'
            })
            continue
          }

          // Add existing user to tenant
          const tenantUserResult = await addUserToTenant(
            validatedData.tenant_id,
            existingUser.id,
            userData.role,
            currentUser.id
          )

          if (tenantUserResult) {
            results.push({
              email: userData.email,
              success: true,
              user_id: existingUser.id,
              tenant_user_id: tenantUserResult.id,
              action: 'added_existing'
            })
          } else {
            results.push({
              email: userData.email,
              success: false,
              error: 'Failed to add to tenant'
            })
          }
          continue
        }

        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: userData.email,
          password: userData.temporary_password || generateRandomPassword(),
          email_confirm: !validatedData.send_invitations,
          user_metadata: {
            full_name: userData.full_name
          }
        })

        if (createError || !newUser.user) {
          results.push({
            email: userData.email,
            success: false,
            error: createError?.message || 'Failed to create user'
          })
          continue
        }

        // Add to tenant
        const tenantUserResult = await addUserToTenant(
          validatedData.tenant_id,
          newUser.user.id,
          userData.role,
          currentUser.id
        )

        if (!tenantUserResult) {
          // Clean up created user
          await supabase.auth.admin.deleteUser(newUser.user.id)
          results.push({
            email: userData.email,
            success: false,
            error: 'Failed to assign to tenant'
          })
          continue
        }

        // Send invitation if requested
        if (validatedData.send_invitations) {
          const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
            userData.email,
            {
              data: {
                full_name: userData.full_name,
                tenant_id: validatedData.tenant_id,
                role: userData.role
              },
              redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
            }
          )

          if (inviteError) {
            console.error(`Error sending invitation to ${userData.email}:`, inviteError)
          }
        }

        results.push({
          email: userData.email,
          success: true,
          user_id: newUser.user.id,
          tenant_user_id: tenantUserResult.id,
          action: 'created'
        })

      } catch (userError) {
        console.error(`Error processing user ${userData.email}:`, userError)
        results.push({
          email: userData.email,
          success: false,
          error: userError instanceof Error ? userError.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} users: ${successCount} successful, ${errorCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: errorCount,
        created: results.filter(r => r.action === 'created').length,
        added_existing: results.filter(r => r.action === 'added_existing').length,
        already_members: results.filter(r => r.action === 'already_member').length
      },
      invitations_sent: validatedData.send_invitations
    })

  } catch (error) {
    console.error('Error in bulk user creation API:', error)
    
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