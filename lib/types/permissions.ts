// Types and constants only - safe for client components

export type UserRole = 'owner' | 'manager' | 'auditor' | 'observer'
export type PermissionLevelName = 'view' | 'input' | 'approve' | 'manage' | 'admin'

// Permission level constants for easy reference
export const PERMISSION_LEVELS = {
  VIEW: 1,
  INPUT: 2,
  APPROVE: 3,
  MANAGE: 4,
  ADMIN: 5
} as const

// Helper function to get role hierarchy level
export function getRolePermissionLevel(role: UserRole): number {
  const levels = {
    'owner': 5,
    'manager': 4,
    'auditor': 2,
    'observer': 1
  }
  return levels[role] || 0
}

// Helper function to check if a role can perform an action
export function roleCanPerform(
  userRole: UserRole,
  requiredLevel: number
): boolean {
  return getRolePermissionLevel(userRole) >= requiredLevel
}