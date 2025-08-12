'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { UserRole, PermissionLevelName, PERMISSION_LEVELS } from '@/lib/types/permissions'

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}

interface TenantUser {
  id: string
  user_id: string
  tenant_id: string
  role: UserRole
  users: User
  invited_at: string | null
  joined_at: string | null
}

interface RoleManagementProps {
  tenantId: string
  currentUserRole: UserRole
  users: TenantUser[]
  onRoleUpdate: (userId: string, newRole: UserRole) => void
  onPermissionGrant: (userId: string, permission: PermissionLevelName) => void
  onPermissionRevoke: (userId: string, permission: PermissionLevelName) => void
}

const ROLE_DESCRIPTIONS = {
  owner: 'Full control over tenant and all features',
  manager: 'Can approve audits and manage users',
  auditor: 'Can input and edit audit data',
  observer: 'Can only view audit data and reports'
}

const ROLE_COLORS = {
  owner: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  auditor: 'bg-green-100 text-green-800',
  observer: 'bg-gray-100 text-gray-800'
}

const PERMISSION_NAMES = {
  view: 'View Data',
  input: 'Input Data',
  approve: 'Approve Submissions',
  manage: 'Manage Users',
  admin: 'Full Admin Access'
}

export function RoleManagement({
  tenantId,
  currentUserRole,
  users,
  onRoleUpdate,
  onPermissionGrant,
  onPermissionRevoke
}: RoleManagementProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showPermissions, setShowPermissions] = useState(false)

  const canManageUsers = currentUserRole === 'owner' || currentUserRole === 'manager'
  const isOwner = currentUserRole === 'owner'

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (!canManageUsers) return
    
    // Prevent non-owners from assigning owner role
    if (newRole === 'owner' && !isOwner) return
    
    onRoleUpdate(userId, newRole)
  }

  const getRolePermissionLevel = (role: UserRole): number => {
    return {
      'owner': PERMISSION_LEVELS.ADMIN,
      'manager': PERMISSION_LEVELS.MANAGE,
      'auditor': PERMISSION_LEVELS.INPUT,
      'observer': PERMISSION_LEVELS.VIEW
    }[role]
  }

  const getAvailableRoles = (): UserRole[] => {
    if (isOwner) {
      return ['owner', 'manager', 'auditor', 'observer']
    }
    // Managers can't assign owner or manager roles
    return ['auditor', 'observer']
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">User Roles & Permissions</h3>
        <Button
          variant="outline"
          onClick={() => setShowPermissions(!showPermissions)}
        >
          {showPermissions ? 'Hide' : 'Show'} Permissions
        </Button>
      </div>

      <div className="grid gap-4">
        {users.map((tenantUser) => (
          <Card key={tenantUser.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {tenantUser.users.full_name?.[0] || tenantUser.users.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{tenantUser.users.full_name || 'Unnamed User'}</p>
                  <p className="text-sm text-gray-500">{tenantUser.users.email}</p>
                  {tenantUser.invited_at && !tenantUser.joined_at && (
                    <p className="text-xs text-yellow-600">Invitation pending</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[tenantUser.role]}`}>
                    {tenantUser.role}
                  </span>
                  <span className="text-xs text-gray-500">
                    Level {getRolePermissionLevel(tenantUser.role)}
                  </span>
                </div>

                {canManageUsers && tenantUser.user_id !== tenantUser.users.id && (
                  <select
                    value={tenantUser.role}
                    onChange={(e) => handleRoleChange(tenantUser.user_id, e.target.value as UserRole)}
                    className="ml-3 border rounded px-2 py-1 text-sm"
                    disabled={!canManageUsers}
                  >
                    {getAvailableRoles().map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {showPermissions && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Permissions</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(PERMISSION_NAMES).map(([key, name]) => {
                    const permissionLevel = PERMISSION_LEVELS[key.toUpperCase() as keyof typeof PERMISSION_LEVELS]
                    const userLevel = getRolePermissionLevel(tenantUser.role)
                    const hasPermission = userLevel >= permissionLevel
                    
                    return (
                      <div
                        key={key}
                        className={`px-2 py-1 rounded text-xs text-center ${
                          hasPermission
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {name}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-3 text-xs text-gray-500">
              {ROLE_DESCRIPTIONS[tenantUser.role]}
            </div>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found in this tenant.
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Role Hierarchy</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium">Owner (Level 5):</span>
            <span>Full administrative control</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Manager (Level 4):</span>
            <span>Manage users and approve data</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Auditor (Level 2):</span>
            <span>Input and edit audit data</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Observer (Level 1):</span>
            <span>View-only access</span>
          </div>
        </div>
      </div>
    </div>
  )
}