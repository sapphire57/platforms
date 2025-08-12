'use server';

import { isValidIcon } from '@/lib/subdomains';
import { createTenant } from '@/lib/models/tenant';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { rootDomain, protocol } from '@/lib/utils';
import { validateSubdomain, validateTenantName, validateEmoji } from '@/lib/validation';

export async function createSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const supabase = await createClient();
  
  const subdomain = formData.get('subdomain') as string;
  const icon = formData.get('icon') as string;

  if (!subdomain || !icon) {
    return { success: false, error: 'Subdomain and icon are required' };
  }

  // Validate subdomain
  const subdomainValidation = validateSubdomain(subdomain);
  if (!subdomainValidation.isValid) {
    return {
      subdomain,
      icon,
      success: false,
      error: subdomainValidation.error
    };
  }

  // Validate emoji
  const emojiValidation = validateEmoji(icon);
  if (!emojiValidation.isValid) {
    return {
      subdomain,
      icon,
      success: false,
      error: emojiValidation.error
    };
  }

  const sanitizedSubdomain = subdomain.toLowerCase().trim();

  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'You must be logged in to create a subdomain'
    };
  }

  // Check if subdomain already exists in Supabase
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('subdomain', sanitizedSubdomain)
    .single();

  if (existingTenant) {
    return {
      subdomain,
      icon,
      success: false,
      error: 'This subdomain is already taken'
    };
  }


  // Create tenant in Supabase
  try {
    const tenantId = await createTenant({
      name: sanitizedSubdomain,
      subdomain: sanitizedSubdomain,
      emoji: icon
    });

    if (!tenantId) {
      return {
        subdomain,
        icon,
        success: false,
        error: 'Failed to create subdomain. Please try again.'
      };
    }

    redirect('/dashboard');
  } catch (error: any) {
    console.error('Error creating tenant:', error);
    
    // Handle specific errors
    if (error.message?.includes('already taken') || error.message?.includes('already exists')) {
      return {
        subdomain,
        icon,
        success: false,
        error: 'This subdomain is already taken'
      };
    }
    
    return {
      subdomain,
      icon,
      success: false,
      error: error.message || 'Failed to create subdomain. Please try again.'
    };
  }
}

export async function deleteSubdomainAction(
  prevState: any,
  formData: FormData
) {
  const supabase = await createClient();
  const subdomain = formData.get('subdomain') as string;

  if (!subdomain) {
    return { success: false, error: 'Subdomain is required' };
  }

  // Check if user is authenticated and has admin access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Authentication required' };
  }

  // Check if user can access admin functions
  const { data: canAccess, error: adminError } = await supabase
    .rpc('can_access_admin');
  
  if (adminError || !canAccess) {
    return { success: false, error: 'Unauthorized: Admin access required' };
  }

  // Delete tenant from Supabase
  const { error } = await supabase
    .from('tenants')
    .delete()
    .eq('subdomain', subdomain);

  if (error) {
    console.error('Error deleting tenant:', error);
    return { success: false, error: 'Failed to delete subdomain' };
  }

  revalidatePath('/admin');
  return { success: true, message: 'Domain deleted successfully' };
}
