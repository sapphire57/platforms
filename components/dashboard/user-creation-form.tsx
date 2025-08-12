'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserRole } from '@/lib/types/permissions'

interface UserCreationFormProps {
  tenantId: string
  onUserCreated?: () => void
}

interface UserFormData {
  email: string
  full_name: string
  role: UserRole
  send_invitation: boolean
  temporary_password?: string
}

const ROLE_OPTIONS = [
  { value: 'observer', label: 'Observer', description: 'View-only access' },
  { value: 'auditor', label: 'Auditor', description: 'Can input and edit data' },
  { value: 'manager', label: 'Manager', description: 'Can approve and manage users' },
  { value: 'owner', label: 'Owner', description: 'Full administrative control' }
] as const

export function UserCreationForm({ tenantId, onUserCreated }: UserCreationFormProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    full_name: '',
    role: 'observer',
    send_invitation: true
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          tenant_id: tenantId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      setSuccess(result.message)
      setFormData({
        email: '',
        full_name: '',
        role: 'observer',
        send_invitation: true
      })
      onUserCreated?.()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Create New User</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => handleChange('role', e.target.value as UserRole)}
            className="w-full mt-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="send_invitation"
            type="checkbox"
            checked={formData.send_invitation}
            onChange={(e) => handleChange('send_invitation', e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="send_invitation" className="text-sm">
            Send invitation email to user
          </Label>
        </div>

        {!formData.send_invitation && (
          <div>
            <Label htmlFor="temporary_password">Temporary Password</Label>
            <Input
              id="temporary_password"
              type="password"
              value={formData.temporary_password || ''}
              onChange={(e) => handleChange('temporary_password', e.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to generate a random password
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            {success}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating User...' : 'Create User'}
        </Button>
      </form>
    </Card>
  )
}