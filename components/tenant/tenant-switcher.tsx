'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
// Removed server-side import - using API instead
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { rootDomain, protocol } from '@/lib/utils'

interface Tenant {
  id: string
  name: string
  subdomain: string
  emoji: string
  subscription_status: string
  subscription_plan: string
}

export function TenantSwitcher() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        try {
          const response = await fetch('/api/tenants');
          if (response.ok) {
            const data = await response.json();
            setTenants(data.tenants || []);
          } else {
            console.error('Failed to fetch tenants');
          }
        } catch (error) {
          console.error('Error fetching tenants:', error);
        }
      }
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (!session?.user) {
          setTenants([])
        } else {
          // Refetch tenants when user logs in
          getUser()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const navigateToTenant = (subdomain: string) => {
    window.location.href = `/s/${subdomain}`
  }

  if (loading) {
    return <div className="p-4">Loading tenants...</div>
  }

  if (!user) {
    return <div className="p-4">Please sign in to view your tenants.</div>
  }

  if (tenants.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600 mb-4">You don't have any tenants yet.</p>
        <Button onClick={() => window.location.href = '/'}>
          Create Your First Tenant
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold mb-4">Your Tenants</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tenants.map((tenant) => (
          <Card key={tenant.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{tenant.emoji}</span>
                <div>
                  <h3 className="font-medium">{tenant.name}</h3>
                  <p className="text-sm text-gray-500">{tenant.subdomain}.{rootDomain}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  tenant.subscription_status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {tenant.subscription_plan}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Button 
                onClick={() => navigateToTenant(tenant.subdomain)}
                className="w-full"
                size="sm"
              >
                Go to Tenant
              </Button>
              <Button 
                onClick={() => window.location.href = `/dashboard/tenant/${tenant.id}/users`}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Manage Users
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}