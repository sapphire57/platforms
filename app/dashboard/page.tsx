import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/models/user'
import { getUserTenants } from '@/lib/models/tenant'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Users, Building2, BarChart3 } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/')
  }

  const currentUser = await getCurrentUser()
  const userTenants = await getUserTenants(user.id)

  return (
    <DashboardLayout 
      tenants={userTenants}
      subtitle={`Welcome back, ${currentUser?.full_name || user.email}`}
    >
      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{userTenants.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Audits</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Account Type</p>
              <p className="text-lg font-semibold text-gray-900">Free</p>
            </div>
            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-gray-600">F</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Plus className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Create Tenant</h3>
              <p className="text-sm text-gray-600">Set up a new audit environment</p>
            </div>
          </div>
          <Link href="/">
            <Button className="w-full">
              Create New Tenant
            </Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Users className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-900">Manage Users</h3>
              <p className="text-sm text-gray-600">Add and manage user access</p>
            </div>
          </div>
          {userTenants.length > 0 ? (
            <Link href={`/dashboard/tenant/${userTenants[0].id}/users`}>
              <Button variant="outline" className="w-full">
                Go to User Management
              </Button>
            </Link>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              No Tenants Available
            </Button>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <BarChart3 className="h-8 w-8 text-orange-600" />
            <div>
              <h3 className="font-semibold text-gray-900">View Reports</h3>
              <p className="text-sm text-gray-600">Access audit reports and analytics</p>
            </div>
          </div>
          <Button variant="outline" className="w-full" disabled>
            Coming Soon
          </Button>
        </Card>
      </div>

      {/* Tenant Management */}
      {userTenants.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Your Tenants</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userTenants.map((tenant: any) => (
              <Card key={tenant.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{tenant.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{tenant.name}</h4>
                    <p className="text-sm text-gray-500">{tenant.subdomain}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tenant.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {tenant.subscription_plan}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <Link href={`/s/${tenant.subdomain}`}>
                    <Button size="sm" className="w-full">
                      <Building2 className="h-4 w-4 mr-2" />
                      View Tenant
                    </Button>
                  </Link>
                  <Link href={`/dashboard/tenant/${tenant.id}/users`}>
                    <Button size="sm" variant="outline" className="w-full">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {userTenants.length === 0 && (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tenants Yet</h3>
          <p className="text-gray-600 mb-6">Create your first tenant to get started with audit management.</p>
          <Link href="/">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Tenant
            </Button>
          </Link>
        </Card>
      )}
    </DashboardLayout>
  )
}