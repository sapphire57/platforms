'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/lib/hooks/use-permissions'
import { UserRole } from '@/lib/types/permissions'

interface PermissionGuardProps {
  tenantId: string
  requiredLevel?: number
  requiredRole?: UserRole
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({
  tenantId,
  requiredLevel,
  requiredRole,
  fallback = null,
  children
}: PermissionGuardProps) {
  const { role, loading, hasPermission } = usePermissions({ tenantId })

  if (loading) {
    return <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
  }

  // Check role-specific permission
  if (requiredRole && role !== requiredRole) {
    return <>{fallback}</>
  }

  // Check level-based permission
  if (requiredLevel && !hasPermission(requiredLevel)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}