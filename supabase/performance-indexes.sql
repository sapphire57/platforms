-- Performance optimization indexes for multi-tenant system

-- Tenants table indexes
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants(subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON public.tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON public.tenants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON public.tenants(subscription_status);

-- Tenant users table indexes  
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_role ON public.tenant_users(role);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_user ON public.tenant_users(tenant_id, user_id);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_system_admin ON public.users(is_system_admin);

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenants_owner_subdomain ON public.tenants(owner_id, subdomain);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_role ON public.tenant_users(user_id, role);