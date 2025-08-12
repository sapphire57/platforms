'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { UserAvatar } from '@/components/auth/user-avatar'
import { rootDomain } from '@/lib/utils'
import Link from 'next/link'

interface DashboardLayoutProps {
  children: ReactNode
  tenants?: Array<{
    id: string
    name: string
    subdomain: string
    emoji: string
  }>
  currentUserRole?: string
  title?: string
  subtitle?: string
}

export function DashboardLayout({ 
  children, 
  tenants = [], 
  currentUserRole,
  title = "Dashboard",
  subtitle
}: DashboardLayoutProps) {
  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar tenants={tenants} currentUserRole={currentUserRole} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link href="/dashboard" className="text-xl font-bold text-gray-900 hover:text-gray-700">
                  {rootDomain}
                </Link>
                {title !== "Dashboard" && (
                  <>
                    <span className="text-gray-400">|</span>
                    <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                  </>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <UserAvatar />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}