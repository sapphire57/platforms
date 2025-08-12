'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { UserCreationForm } from './user-creation-form'
import { BulkUserImport } from './bulk-user-import'
import { RoleManagement } from '../tenant/role-management'
import { UserRole } from '@/lib/types/permissions'

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

interface TenantUser {
  id: string
  user_id: string
  tenant_id: string
  role: UserRole
  users: User
  invited_at: string | null
  joined_at: string | null
  created_at: string
}

interface UserManagementDashboardProps {
  tenantId: string
  currentUserRole: UserRole
}

export function UserManagementDashboard({ tenantId, currentUserRole }: UserManagementDashboardProps) {
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'bulk' | 'roles'>('list')
  const [refreshKey, setRefreshKey] = useState(0)

  const canManageUsers = currentUserRole === 'owner' || currentUserRole === 'manager'

  useEffect(() => {
    fetchUsers()
  }, [tenantId, refreshKey])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/users/create?tenant_id=${tenantId}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 403) {
          setError('Access denied. You may not be properly added to this tenant.')
        } else {
          setError(errorData.error || 'Failed to fetch users')
        }
        setUsers([])
        return
      }

      const data = await response.json()
      setUsers(data.users || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      const response = await fetch('/api/users/update-role', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId,
          role: newRole
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update role')
      }

      handleRefresh()
    } catch (err) {
      console.error('Error updating role:', err)
    }
  }

  const handleUserRemoval = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the tenant?')) {
      return
    }

    try {
      const response = await fetch('/api/users/remove', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          user_id: userId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to remove user')
      }

      handleRefresh()
    } catch (err) {
      console.error('Error removing user:', err)
    }
  }

  const tabs = [
    { id: 'list', label: 'User List', enabled: true },
    { id: 'create', label: 'Create User', enabled: canManageUsers },
    { id: 'bulk', label: 'Bulk Import', enabled: canManageUsers },
    { id: 'roles', label: 'Role Management', enabled: canManageUsers }
  ].filter(tab => tab.enabled)

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-gray-200 h-8 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-64 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Button onClick={handleRefresh} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'list' && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Users ({users.length})
            </h3>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found in this tenant.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Joined</th>
                    {canManageUsers && <th className="text-left p-2">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map((tenantUser) => (
                    <tr key={tenantUser.id} className="border-b">
                      <td className="p-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                            {tenantUser.users.full_name?.[0] || tenantUser.users.email[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">
                              {tenantUser.users.full_name || 'Unnamed User'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {tenantUser.users.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tenantUser.role === 'owner' ? 'bg-red-100 text-red-800' :
                          tenantUser.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                          tenantUser.role === 'auditor' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {tenantUser.role}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          tenantUser.joined_at 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tenantUser.joined_at ? 'Active' : 'Invited'}
                        </span>
                      </td>
                      <td className="p-2 text-sm text-gray-500">
                        {tenantUser.joined_at 
                          ? new Date(tenantUser.joined_at).toLocaleDateString()
                          : 'Pending'
                        }
                      </td>
                      {canManageUsers && (
                        <td className="p-2">
                          <div className="flex space-x-2">
                            <select
                              value={tenantUser.role}
                              onChange={(e) => handleRoleUpdate(tenantUser.user_id, e.target.value as UserRole)}
                              className="text-xs border rounded px-2 py-1"
                              disabled={tenantUser.role === 'owner' && currentUserRole !== 'owner'}
                            >
                              <option value="observer">Observer</option>
                              <option value="auditor">Auditor</option>
                              <option value="manager">Manager</option>
                              {currentUserRole === 'owner' && (
                                <option value="owner">Owner</option>
                              )}
                            </select>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserRemoval(tenantUser.user_id)}
                              className="text-red-600 hover:text-red-700"
                              disabled={tenantUser.role === 'owner'}
                            >
                              Remove
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'create' && canManageUsers && (
        <UserCreationForm
          tenantId={tenantId}
          onUserCreated={handleRefresh}
        />
      )}

      {activeTab === 'bulk' && canManageUsers && (
        <BulkUserImport
          tenantId={tenantId}
          onImportComplete={handleRefresh}
        />
      )}

      {activeTab === 'roles' && canManageUsers && (
        <RoleManagement
          tenantId={tenantId}
          currentUserRole={currentUserRole}
          users={users}
          onRoleUpdate={handleRoleUpdate}
          onPermissionGrant={() => {}}
          onPermissionRevoke={() => {}}
        />
      )}
    </div>
  )
}