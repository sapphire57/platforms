import { getTenantBySubdomain } from '@/lib/models/tenant';

export function isValidIcon(str: string) {
  if (str.length > 10) {
    return false;
  }

  try {
    // Primary validation: Check if the string contains at least one emoji character
    // This regex pattern matches most emoji Unicode ranges
    const emojiPattern = /[\p{Emoji}]/u;
    if (emojiPattern.test(str)) {
      return true;
    }
  } catch (error) {
    // If the regex fails (e.g., in environments that don't support Unicode property escapes),
    // fall back to a simpler validation
    console.warn(
      'Emoji regex validation failed, using fallback validation',
      error
    );
  }

  // Fallback validation: Check if the string is within a reasonable length
  // This is less secure but better than no validation
  return str.length >= 1 && str.length <= 10;
}

type SubdomainData = {
  emoji: string;
  createdAt: number;
};

export async function getSubdomainData(subdomain: string) {
  const sanitizedSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');
  
  // Get tenant data from Supabase
  const tenant = await getTenantBySubdomain(sanitizedSubdomain);
  if (tenant) {
    return {
      emoji: tenant.emoji,
      createdAt: new Date(tenant.created_at).getTime()
    };
  }
  
  return null;
}

export async function getAllSubdomains() {
  const { getAllTenants } = await import('@/lib/models/tenant');
  
  // Get all tenants from Supabase
  const tenants = await getAllTenants();
  return tenants.map(tenant => ({
    subdomain: tenant.subdomain,
    emoji: tenant.emoji,
    createdAt: new Date(tenant.created_at).getTime()
  })).sort((a, b) => b.createdAt - a.createdAt);
}
