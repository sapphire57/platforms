'use client'

import { Button } from '@/components/ui/button'
import { AuthModal } from './auth-modal'

export function AuthButton() {
  return (
    <AuthModal>
      <Button>Sign In</Button>
    </AuthModal>
  )
}