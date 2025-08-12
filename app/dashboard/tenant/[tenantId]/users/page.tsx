import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantRole } from '@/lib/models/user'
import { getUserTenants } from '@/lib/models/tenant'
import { redirect } from 'next/navigation'
import { UserManagementDashboard } from '@/components/dashboard/user-management-dashboard'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'

interface TenantUserManagementPageProps {
  params: Promise<{ tenantId: string }>
}

export default async function TenantUserManagementPage({ params }: TenantUserManagementPageProps) {
  const { tenantId } = await params
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/auth/login')
  }

  // Get current user info
  const currentUser = await getCurrentUser()
  const userTenants = await getUserTenants(user.id)
  
  // Check if user has access to this tenant
  const userRole = await getUserTenantRole(user.id, tenantId)
  if (!userRole) {
    redirect('/dashboard?error=access-denied')
  }

  // Check if user can manage users (only owners and managers)
  if (!['owner', 'manager'].includes(userRole)) {
    redirect('/dashboard?error=insufficient-permissions')
  }

  // Get tenant information
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, subdomain, emoji')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    redirect('/dashboard?error=tenant-not-found')
  }

  return (
    <DashboardLayout 
      tenants={userTenants}
      currentUserRole={userRole}
      title={`${tenant.emoji} ${tenant.name} - User Management`}
      subtitle={`Manage users, roles, and permissions for ${tenant.subdomain}`}
    >
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              userRole === 'owner' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              Your role: {userRole}
            </span>
          </div>
        </div>
      </div>

      <UserManagementDashboard 
        tenantId={tenantId}
        currentUserRole={userRole}
      />
    </DashboardLayout>
  )
}