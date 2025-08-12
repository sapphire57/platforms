'use client'

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface UserAvatarProps {
  className?: string
}

export function UserAvatar({ className }: UserAvatarProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      // Use server-side logout for complete session cleanup
      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Also sign out on client side
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
      } else {
        throw new Error('Failed to sign out')
      }
    } catch (error) {
      console.error('Error signing out:', error)
      // Fallback to client-side only logout
      try {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
      } catch (fallbackError) {
        console.error('Fallback logout also failed:', fallbackError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}>
          {user.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.full_name || user.email}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              {user.email?.[0]?.toUpperCase()}
            </div>
          )}
          <span className="text-sm font-medium">
            {user.user_metadata?.full_name || user.email}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-3">
          <div className="border-b pb-3">
            <p className="font-medium text-sm">{user.user_metadata?.full_name || 'User'}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={() => router.push('/dashboard')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              </svg>
              Dashboard
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start h-8 px-2 text-sm"
              onClick={() => router.push('/admin')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Admin
            </Button>
          </div>

          <div className="border-t pt-3">
            <Button
              variant="ghost"
              className="w-full justify-start h-8 px-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
              disabled={isLoading}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isLoading ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}