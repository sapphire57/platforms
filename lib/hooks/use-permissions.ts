'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole, PermissionLevelName, PERMISSION_LEVELS, getRolePermissionLevel } from '@/lib/types/permissions'

interface UsePermissionsProps {
  tenantId: string
  userId?: string
}

interface PermissionState {
  role: UserRole | null
  loading: boolean
  error: string | null
}

export function usePermissions({ tenantId, userId }: UsePermissionsProps) {
  const [state, setState] = useState<PermissionState>({
    role: null,
    loading: true,
    error: null
  })

  useEffect(() => {
    let mounted = true

    async function fetchUserRole() {
      if (!tenantId) return

      try {
        const supabase = createClient()
        
        // Get current user if userId not provided
        let targetUserId = userId
        if (!targetUserId) {
          const { data: { user }, error: authError } = await supabase.auth.getUser()
          if (authError || !user) {
            if (mounted) {
              setState({ role: null, loading: false, error: 'Not authenticated' })
            }
            return
          }
          targetUserId = user.id
        }

        // Fetch user's role in the tenant
        const { data, error } = await supabase
          .from('tenant_users')
          .select('role')
          .eq('tenant_id', tenantId)
          .eq('user_id', targetUserId)
          .single()

        if (mounted) {
          if (error) {
            setState({ role: null, loading: false, error: error.message })
          } else {
            setState({ role: data.role, loading: false, error: null })
          }
        }
      } catch (error) {
        if (mounted) {
          setState({ 
            role: null, 
            loading: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
    }

    fetchUserRole()

    return () => {
      mounted = false
    }
  }, [tenantId, userId])

  // Check if user has specific permission level
  const hasPermission = (requiredLevel: number): boolean => {
    if (!state.role) return false
    return getRolePermissionLevel(state.role) >= requiredLevel
  }

  // Check if user has named permission
  const hasNamedPermission = (permission: PermissionLevelName): boolean => {
    const requiredLevel = PERMISSION_LEVELS[permission.toUpperCase() as keyof typeof PERMISSION_LEVELS]
    return hasPermission(requiredLevel)
  }

  // Check if user can perform specific actions
  const can = {
    view: () => hasPermission(PERMISSION_LEVELS.VIEW),
    input: () => hasPermission(PERMISSION_LEVELS.INPUT),
    approve: () => hasPermission(PERMISSION_LEVELS.APPROVE),
    manage: () => hasPermission(PERMISSION_LEVELS.MANAGE),
    admin: () => hasPermission(PERMISSION_LEVELS.ADMIN),
    
    // Role-specific checks
    isOwner: () => state.role === 'owner',
    isManager: () => state.role === 'manager',
    isAuditor: () => state.role === 'auditor',
    isObserver: () => state.role === 'observer',
    
    // Combined checks
    canManageUsers: () => state.role === 'owner' || state.role === 'manager',
    canEditData: () => hasPermission(PERMISSION_LEVELS.INPUT),
    canViewData: () => hasPermission(PERMISSION_LEVELS.VIEW)
  }

  return {
    role: state.role,
    loading: state.loading,
    error: state.error,
    hasPermission,
    hasNamedPermission,
    can
  }
}

// PermissionGuard component moved to components/auth/permission-guard.tsx

// Hook for checking permissions in server components
export async function checkServerPermission(
  tenantId: string,
  userId: string,
  requiredLevel: number
): Promise<boolean> {
  const { createClient } = await import('@/lib/supabase/server')
  
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (error || !data) return false

    return getRolePermissionLevel(data.role) >= requiredLevel
  } catch {
    return false
  }
}