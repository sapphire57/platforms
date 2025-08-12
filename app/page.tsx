import Link from 'next/link';
import { SubdomainForm } from './subdomain-form';
import { rootDomain } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { AuthButton } from '@/components/auth/auth-button';
import { AuthModal } from '@/components/auth/auth-modal';
import { UserAvatar } from '@/components/auth/user-avatar';
import { getUserTenants } from '@/lib/models/tenant';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  console.log('HomePage: User status:', user ? 'authenticated' : 'not authenticated');
  console.log('HomePage: User ID:', user?.id);

  // If user is logged in, redirect to dashboard
  if (user) {
    console.log('HomePage: Redirecting to dashboard');
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4 relative">
      <div className="absolute top-4 right-4 flex items-center gap-4">
        {user ? (
          <>
            <UserAvatar />
            <Link
              href="/admin"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Admin
            </Link>
          </>
        ) : (
          <AuthButton />
        )}
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            {rootDomain}
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Create your own subdomain with a custom emoji
          </p>
          {!user && (
            <div className="mt-4">
              <AuthModal>
                <Button variant="outline">Sign in to create a subdomain</Button>
              </AuthModal>
            </div>
          )}
        </div>

        {user && (
          <div className="mt-8 bg-white shadow-md rounded-lg p-6">
            <SubdomainForm />
          </div>
        )}
      </div>
    </div>
  );
}
