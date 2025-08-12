'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Users, 
  Building2, 
  Settings, 
  Home, 
  Plus,
  ChevronLeft,
  Menu
} from 'lucide-react'

interface SidebarProps {
  tenants?: Array<{
    id: string
    name: string
    subdomain: string
    emoji: string
  }>
  currentUserRole?: string
}

export function Sidebar({ tenants = [], currentUserRole }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: pathname === '/dashboard'
    },
    {
      name: 'Create Tenant',
      href: '/',
      icon: Plus,
      current: false
    }
  ]

  return (
    <div className={cn(
      "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                item.current
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {/* Tenants Section */}
        {tenants.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-200">
            {!collapsed && (
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Your Tenants
              </h3>
            )}
            <div className="space-y-1">
              {tenants.slice(0, collapsed ? 3 : 5).map((tenant) => (
                <div key={tenant.id} className="space-y-1">
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm rounded-md",
                    "text-gray-600 hover:bg-gray-50"
                  )}>
                    <span className="text-lg flex-shrink-0">{tenant.emoji}</span>
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{tenant.name}</p>
                        <p className="text-xs text-gray-500 truncate">{tenant.subdomain}</p>
                      </div>
                    )}
                  </div>
                  
                  {!collapsed && (currentUserRole === 'owner' || currentUserRole === 'manager') && (
                    <div className="ml-9 space-y-1">
                      <Link
                        href={`/dashboard/tenant/${tenant.id}/users`}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1 text-xs rounded-md transition-colors",
                          pathname.includes(`/tenant/${tenant.id}/users`)
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        <Users className="h-3 w-3" />
                        Manage Users
                      </Link>
                      <Link
                        href={`/s/${tenant.subdomain}`}
                        className="flex items-center gap-2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <Building2 className="h-3 w-3" />
                        View Tenant
                      </Link>
                    </div>
                  )}
                </div>
              ))}
              
              {tenants.length > (collapsed ? 3 : 5) && !collapsed && (
                <p className="px-3 py-2 text-xs text-gray-500">
                  +{tenants.length - 5} more tenants
                </p>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          )}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {!collapsed && <span>Admin Panel</span>}
        </Link>
      </div>
    </div>
  )
}