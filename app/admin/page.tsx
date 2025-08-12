import { getAllSubdomains } from '@/lib/subdomains';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/models/user';
import type { Metadata } from 'next';
import { AdminDashboard } from './dashboard';
import { rootDomain } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { UserAvatar } from '@/components/auth/user-avatar';

export const metadata: Metadata = {
  title: `Admin Dashboard | ${rootDomain}`,
  description: `Manage subdomains for ${rootDomain}`
};

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect to home if not authenticated
  if (error || !user) {
    redirect('/');
  }

  const currentUser = await getCurrentUser();
  const tenants = await getAllSubdomains();

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <UserAvatar />
      </div>
      <AdminDashboard tenants={tenants} />
    </div>
  );
}
