-- Safe step-by-step role system migration
-- Run each step separately to avoid dependency issues

-- STEP 1: Create new enum type
CREATE TYPE user_role_new AS ENUM (
  'owner',    -- Full tenant ownership
  'manager',  -- Management and approval permissions
  'auditor',  -- Data input and editing permissions
  'observer'  -- Read-only permissions
);

-- STEP 2: Add new column
ALTER TABLE public.tenant_users 
ADD COLUMN role_new user_role_new;

-- STEP 3: Migrate data
UPDATE public.tenant_users SET role_new = CASE 
  WHEN role = 'owner' THEN 'owner'::user_role_new
  WHEN role = 'admin' THEN 'manager'::user_role_new
  WHEN role = 'member' THEN 'auditor'::user_role_new
  ELSE 'observer'::user_role_new
END;

-- STEP 4: Make new column NOT NULL
ALTER TABLE public.tenant_users 
ALTER COLUMN role_new SET NOT NULL;

-- STEP 5: Drop dependent policies
DROP POLICY IF EXISTS "Users can view tenant memberships they belong to" ON public.tenant_users;
DROP POLICY IF EXISTS "Tenant owners/admins can manage memberships" ON public.tenant_users;

-- STEP 6: Drop old column
ALTER TABLE public.tenant_users DROP COLUMN role;

-- STEP 7: Rename new column
ALTER TABLE public.tenant_users RENAME COLUMN role_new TO role;

-- STEP 8: Drop old enum and rename new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- STEP 9: Set default value
ALTER TABLE public.tenant_users 
ALTER COLUMN role SET DEFAULT 'observer';

-- STEP 10: Recreate policies with new roles
CREATE POLICY "Users can view tenant memberships they belong to" ON public.tenant_users
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.tenant_users tu2 
      WHERE tu2.tenant_id = tenant_users.tenant_id 
      AND tu2.user_id = auth.uid() 
      AND tu2.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners and managers can manage memberships" ON public.tenant_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users 
      WHERE tenant_id = tenant_users.tenant_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'manager')
    )
  );

-- STEP 11: Update storage policies
DROP POLICY IF EXISTS "Tenant members can upload assets" ON storage.objects;

CREATE POLICY "Tenant auditors and managers can upload assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'tenant-assets' AND 
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      JOIN public.tenants t ON t.id = tu.tenant_id
      WHERE t.subdomain = (storage.foldername(name))[1]
      AND tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'manager', 'auditor')
    )
  );

-- STEP 12: Create permission system tables
CREATE TABLE public.permission_levels (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  level integer NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

INSERT INTO public.permission_levels (name, description, level) VALUES
  ('view', 'Can view data and reports', 1),
  ('input', 'Can input and edit data', 2),
  ('approve', 'Can approve submissions', 3),
  ('manage', 'Can manage users and settings', 4),
  ('admin', 'Full administrative access', 5);

CREATE TABLE public.user_permissions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  permission_level_id uuid REFERENCES public.permission_levels(id) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES public.users(id),
  granted_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, tenant_id, permission_level_id)
);

-- STEP 13: Enable RLS on new tables
ALTER TABLE public.permission_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- STEP 14: Create policies for permission tables
CREATE POLICY "Permission levels are publicly readable" ON public.permission_levels
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view relevant permissions" ON public.user_permissions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = user_permissions.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'manager')
    )
  );

CREATE POLICY "Managers can grant permissions" ON public.user_permissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = user_permissions.tenant_id
      AND tu.user_id = auth.uid()
      AND tu.role IN ('owner', 'manager')
    )
  );

-- STEP 15: Create helper functions
CREATE OR REPLACE FUNCTION public.user_has_permission(
  tenant_id_param uuid,
  required_role text
) RETURNS boolean AS $$
DECLARE
  user_role_text text;
BEGIN
  SELECT role::text INTO user_role_text
  FROM public.tenant_users 
  WHERE tenant_id = tenant_id_param 
  AND user_id = auth.uid();
  
  IF user_role_text IS NULL THEN
    RETURN false;
  END IF;
  
  CASE required_role
    WHEN 'observer' THEN 
      RETURN user_role_text IN ('observer', 'auditor', 'manager', 'owner');
    WHEN 'auditor' THEN 
      RETURN user_role_text IN ('auditor', 'manager', 'owner');
    WHEN 'manager' THEN 
      RETURN user_role_text IN ('manager', 'owner');
    WHEN 'owner' THEN 
      RETURN user_role_text = 'owner';
    ELSE 
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_has_specific_permission(
  tenant_id_param uuid,
  permission_name text
) RETURNS boolean AS $$
DECLARE
  required_level integer;
  user_max_level integer;
BEGIN
  SELECT level INTO required_level
  FROM public.permission_levels
  WHERE name = permission_name;
  
  IF required_level IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT COALESCE(MAX(pl.level), 0) INTO user_max_level
  FROM public.user_permissions up
  JOIN public.permission_levels pl ON pl.id = up.permission_level_id
  WHERE up.tenant_id = tenant_id_param
  AND up.user_id = auth.uid();
  
  IF user_max_level = 0 THEN
    SELECT CASE 
      WHEN role = 'owner' THEN 5
      WHEN role = 'manager' THEN 4
      WHEN role = 'auditor' THEN 2
      WHEN role = 'observer' THEN 1
      ELSE 0
    END INTO user_max_level
    FROM public.tenant_users
    WHERE tenant_id = tenant_id_param
    AND user_id = auth.uid();
  END IF;
  
  RETURN user_max_level >= required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 16: Create indexes
CREATE INDEX idx_user_permissions_user_tenant ON public.user_permissions(user_id, tenant_id);
CREATE INDEX idx_user_permissions_tenant_permission ON public.user_permissions(tenant_id, permission_level_id);
CREATE INDEX idx_tenant_users_tenant_role ON public.tenant_users(tenant_id, role);

-- STEP 17: Add comments
COMMENT ON TYPE user_role IS 'User roles within tenants: owner (full control), manager (approve audits, manage users), auditor (input audit data), observer (view only)';
COMMENT ON TABLE public.permission_levels IS 'Defines granular permission levels that can be assigned to users';
COMMENT ON TABLE public.user_permissions IS 'Junction table for assigning specific permissions to users within tenants';
COMMENT ON FUNCTION public.user_has_permission IS 'Check if current user has required permission level in a tenant. Roles are hierarchical.';
COMMENT ON FUNCTION public.user_has_specific_permission IS 'Check if user has specific named permission in a tenant. Combines role-based and explicit permissions.';

-- Migration complete!
-- Verify by running: SELECT role FROM public.tenant_users LIMIT 5;