-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create custom types
create type subscription_status as enum ('trial', 'active', 'cancelled', 'past_due');
create type subscription_plan as enum ('free', 'pro', 'enterprise');
create type user_role as enum ('owner', 'admin', 'member');

-- Create users table (extends auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create tenants table
create table public.tenants (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  subdomain text unique not null,
  emoji text not null default '🏢',
  owner_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  subscription_status subscription_status default 'trial' not null,
  subscription_plan subscription_plan default 'free' not null,
  
  constraint subdomain_format check (subdomain ~ '^[a-z0-9-]+$'),
  constraint subdomain_length check (char_length(subdomain) >= 3 and char_length(subdomain) <= 63)
);

-- Create tenant_users junction table (many-to-many relationship)
create table public.tenant_users (
  id uuid default uuid_generate_v4() primary key,
  tenant_id uuid references public.tenants(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  role user_role default 'member' not null,
  invited_by uuid references public.users(id),
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz default now() not null,
  
  unique(tenant_id, user_id)
);

-- Create storage buckets
insert into storage.buckets (id, name, public) values 
  ('tenant-assets', 'tenant-assets', true),
  ('user-avatars', 'user-avatars', true);

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;

-- Users can read and update their own record
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Tenants policies
create policy "Users can view tenants they belong to" on public.tenants
  for select using (
    exists (
      select 1 from public.tenant_users 
      where tenant_id = tenants.id 
      and user_id = auth.uid()
    )
  );

create policy "Tenant owners can update their tenants" on public.tenants
  for update using (owner_id = auth.uid());

create policy "Authenticated users can create tenants" on public.tenants
  for insert with check (auth.uid() = owner_id);

-- Tenant users policies
create policy "Users can view tenant memberships they belong to" on public.tenant_users
  for select using (
    user_id = auth.uid() or 
    exists (
      select 1 from public.tenant_users tu2 
      where tu2.tenant_id = tenant_users.tenant_id 
      and tu2.user_id = auth.uid() 
      and tu2.role in ('owner', 'admin')
    )
  );

create policy "Tenant owners/admins can manage memberships" on public.tenant_users
  for all using (
    exists (
      select 1 from public.tenant_users 
      where tenant_id = tenant_users.tenant_id 
      and user_id = auth.uid() 
      and role in ('owner', 'admin')
    )
  );

-- Storage policies
create policy "Users can upload their own avatars" on storage.objects
  for insert with check (
    bucket_id = 'user-avatars' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view all avatars" on storage.objects
  for select using (bucket_id = 'user-avatars');

create policy "Tenant members can upload assets" on storage.objects
  for insert with check (
    bucket_id = 'tenant-assets' and 
    exists (
      select 1 from public.tenant_users tu
      join public.tenants t on t.id = tu.tenant_id
      where t.subdomain = (storage.foldername(name))[1]
      and tu.user_id = auth.uid()
    )
  );

create policy "Anyone can view tenant assets" on storage.objects
  for select using (bucket_id = 'tenant-assets');

-- Functions and triggers
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create user profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to create tenant with owner relationship
create or replace function public.create_tenant_with_owner(
  tenant_name text,
  tenant_subdomain text,
  tenant_emoji text
) returns uuid as $$
declare
  new_tenant_id uuid;
begin
  -- Insert tenant
  insert into public.tenants (name, subdomain, emoji, owner_id)
  values (tenant_name, tenant_subdomain, tenant_emoji, auth.uid())
  returning id into new_tenant_id;
  
  -- Add owner to tenant_users
  insert into public.tenant_users (tenant_id, user_id, role, joined_at)
  values (new_tenant_id, auth.uid(), 'owner', now());
  
  return new_tenant_id;
end;
$$ language plpgsql security definer;

-- Update timestamp trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_users_updated_at before update on public.users
  for each row execute procedure public.update_updated_at_column();

create trigger update_tenants_updated_at before update on public.tenants
  for each row execute procedure public.update_updated_at_column();