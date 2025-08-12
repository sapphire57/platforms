-- DATABASE FIX FOR 500 ERROR IN USER MANAGEMENT
-- Copy and paste these commands into your Supabase SQL Editor

-- 1. Check if role migration is applied
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tenant_users' AND column_name = 'role';

-- 2. Check existing tenant_users data
SELECT tu.*, u.email, t.subdomain 
FROM tenant_users tu
JOIN users u ON u.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id;

-- 3. Create the function for proper tenant creation with owner relationships
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  tenant_name text,
  tenant_subdomain text,
  tenant_emoji text
) RETURNS uuid AS $$
DECLARE
  new_tenant_id uuid;
  current_user_id uuid;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create the tenant
  INSERT INTO public.tenants (name, subdomain, emoji, owner_id)
  VALUES (tenant_name, tenant_subdomain, tenant_emoji, current_user_id)
  RETURNING id INTO new_tenant_id;

  -- Add the owner to tenant_users with owner role
  INSERT INTO public.tenant_users (tenant_id, user_id, role, joined_at)
  VALUES (new_tenant_id, current_user_id, 'owner', now());

  RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions on the function
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner TO authenticated;

-- 5. Fix existing tenants that might not have owner relationships
-- This will add missing owner relationships for tenants
INSERT INTO public.tenant_users (tenant_id, user_id, role, joined_at)
SELECT t.id, t.owner_id, 'owner', now()
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON tu.tenant_id = t.id AND tu.user_id = t.owner_id
WHERE tu.id IS NULL AND t.owner_id IS NOT NULL;

-- 6. Verify the fix worked
SELECT 
  t.subdomain,
  u.email,
  tu.role,
  tu.joined_at
FROM public.tenants t
JOIN public.tenant_users tu ON tu.tenant_id = t.id
JOIN public.users u ON u.id = tu.user_id
ORDER BY t.created_at DESC;