import { createClient } from '@/lib/supabase/server';
import { getUserTenants } from '@/lib/models/tenant';

export default async function DebugAuthPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  let tenants = null;
  let tenantError = null;

  if (user) {
    try {
      tenants = await getUserTenants(user.id);
    } catch (error) {
      tenantError = error;
    }
  }

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Auth Debug</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold">Auth Status:</h2>
        <p>User: {user ? 'Authenticated' : 'Not authenticated'}</p>
        <p>Auth Error: {authError ? authError.message : 'None'}</p>
        {user && (
          <>
            <p>User ID: {user.id}</p>
            <p>Email: {user.email}</p>
            <p>Email Confirmed: {user.email_confirmed_at ? 'Yes' : 'No'}</p>
          </>
        )}
      </div>

      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold">Tenants:</h2>
        <p>Tenant Error: {tenantError ? String(tenantError) : 'None'}</p>
        <p>Tenant Count: {tenants ? tenants.length : 'N/A'}</p>
        {tenants && tenants.length > 0 && (
          <ul>
            {tenants.map((tenant: any) => (
              <li key={tenant.id}>{tenant.subdomain} - {tenant.emoji}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}