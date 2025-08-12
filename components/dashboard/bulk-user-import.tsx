'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { UserRole } from '@/lib/types/permissions'

interface BulkUserImportProps {
  tenantId: string
  onImportComplete?: () => void
}

interface BulkImportResult {
  email: string
  success: boolean
  user_id?: string
  error?: string
  action?: 'created' | 'added_existing' | 'already_member'
}

interface ImportSummary {
  total: number
  successful: number
  failed: number
  created: number
  added_existing: number
  already_members: number
}

export function BulkUserImport({ tenantId, onImportComplete }: BulkUserImportProps) {
  const [csvData, setCsvData] = useState('')
  const [defaultRole, setDefaultRole] = useState<UserRole>('observer')
  const [sendInvitations, setSendInvitations] = useState(true)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<BulkImportResult[] | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvData(content)
      setError(null)
    }
    reader.onerror = () => {
      setError('Failed to read file')
    }
    reader.readAsText(file)
  }

  const parseCsvData = (csv: string) => {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) throw new Error('CSV must have at least a header and one data row')

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Validate required columns
    const requiredColumns = ['email', 'full_name']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    const users = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has incorrect number of columns`)
      }

      const user: any = {}
      headers.forEach((header, index) => {
        user[header] = values[index]
      })

      // Validate required fields
      if (!user.email || !user.full_name) {
        throw new Error(`Row ${i + 1} is missing required fields`)
      }

      // Use role from CSV or default role
      user.role = user.role || defaultRole

      // Validate role
      if (!['observer', 'auditor', 'manager', 'owner'].includes(user.role)) {
        throw new Error(`Row ${i + 1} has invalid role: ${user.role}`)
      }

      users.push(user)
    }

    return users
  }

  const handleImport = async () => {
    if (!csvData.trim()) {
      setError('Please upload a CSV file or paste CSV data')
      return
    }

    setLoading(true)
    setError(null)
    setResults(null)
    setSummary(null)

    try {
      const users = parseCsvData(csvData)

      const response = await fetch('/api/users/bulk-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          users: users,
          send_invitations: sendInvitations
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import users')
      }

      setResults(result.results)
      setSummary(result.summary)
      onImportComplete?.()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'email,full_name,role\nexample@company.com,John Doe,auditor\nuser2@company.com,Jane Smith,observer'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'user-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Bulk User Import</h3>
      
      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Upload CSV File
          </label>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2"
            />
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
            >
              Download Template
            </Button>
          </div>
        </div>

        {/* CSV Data Textarea */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Or Paste CSV Data
          </label>
          <textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="email,full_name,role&#10;user@example.com,John Doe,auditor"
            className="w-full h-32 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
          />
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Default Role (if not specified in CSV)
            </label>
            <select
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value as UserRole)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="observer">Observer</option>
              <option value="auditor">Auditor</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <input
              id="send_invitations_bulk"
              type="checkbox"
              checked={sendInvitations}
              onChange={(e) => setSendInvitations(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="send_invitations_bulk" className="text-sm">
              Send invitation emails
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {summary && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2">Import Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
              <div>Total: {summary.total}</div>
              <div>Successful: {summary.successful}</div>
              <div>Failed: {summary.failed}</div>
              <div>Created: {summary.created}</div>
              <div>Added Existing: {summary.added_existing}</div>
              <div>Already Members: {summary.already_members}</div>
            </div>
          </div>
        )}

        {results && (
          <div className="max-h-64 overflow-y-auto border rounded-md">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{result.email}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        result.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="p-2 text-xs">
                      {result.success ? (
                        result.action === 'created' ? 'User created' :
                        result.action === 'added_existing' ? 'Added to tenant' :
                        'Already member'
                      ) : (
                        result.error
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button
          onClick={handleImport}
          disabled={loading || !csvData.trim()}
          className="w-full"
        >
          {loading ? 'Importing Users...' : 'Import Users'}
        </Button>
      </div>
    </Card>
  )
}