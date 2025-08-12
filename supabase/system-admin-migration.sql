-- Add system admin functionality
-- First, extend the users table to track system admin status
ALTER TABLE public.users ADD COLUMN is_system_admin BOOLEAN DEFAULT FALSE;

-- Update the first user to be system admin (run this after first user signs up)
-- UPDATE public.users SET is_system_admin = TRUE WHERE created_at = (SELECT MIN(created_at) FROM public.users);

-- Create function to check if user is system admin
CREATE OR REPLACE FUNCTION public.is_user_system_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = user_id AND is_system_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can access admin functions
CREATE OR REPLACE FUNCTION public.can_access_admin()
RETURNS boolean AS $$
BEGIN
  -- System admins can access all admin functions
  IF is_user_system_admin() THEN
    RETURN TRUE;
  END IF;
  
  -- Regular users can only access admin if they own at least one tenant
  RETURN EXISTS (
    SELECT 1 FROM public.tenants 
    WHERE owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update tenants RLS policy to allow system admins to see all tenants
DROP POLICY IF EXISTS "Users can view tenants they belong to" ON public.tenants;

CREATE POLICY "Users can view accessible tenants" ON public.tenants
  FOR SELECT USING (
    -- System admins can see all tenants
    is_user_system_admin() OR
    -- Regular users can see tenants they belong to
    EXISTS (
      SELECT 1 FROM public.tenant_users 
      WHERE tenant_id = tenants.id 
      AND user_id = auth.uid()
    )
  );

-- Add trigger to make first user system admin
CREATE OR REPLACE FUNCTION public.make_first_user_system_admin()
RETURNS trigger AS $$
BEGIN
  -- Check if this is the first user
  IF (SELECT COUNT(*) FROM public.users) = 1 THEN
    NEW.is_system_admin = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER set_first_user_as_system_admin
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.make_first_user_system_admin();