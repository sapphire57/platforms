// Validation utilities for the multi-tenant system

export const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'app',
  'admin',
  'dashboard',
  'blog',
  'docs',
  'help',
  'support',
  'mail',
  'email',
  'ftp',
  'cdn',
  'static',
  'assets',
  'media',
  'images',
  'files',
  'download',
  'uploads',
  'status',
  'test',
  'staging',
  'dev',
  'development',
  'prod',
  'production',
  'preview',
  'demo',
  'beta',
  'alpha',
  'public',
  'private',
  'secure',
  'auth',
  'login',
  'logout',
  'signup',
  'register',
  'account',
  'profile',
  'settings',
  'config',
  'console',
  'panel',
  'control',
  'manage',
  'management',
  'client',
  'customer',
  'user',
  'users',
  'tenant',
  'tenants',
  'subdomain',
  'subdomains',
  's',
  'ns',
  'dns',
  'mx',
  'mail',
  'smtp',
  'pop',
  'imap',
  'webmail',
  'calendar',
  'cal',
  'meet',
  'video',
  'chat',
  'forum',
  'community',
  'social',
  'network'
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateSubdomain(subdomain: string): ValidationResult {
  if (!subdomain) {
    return { isValid: false, error: 'Subdomain is required' };
  }

  const trimmed = subdomain.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Subdomain cannot be empty' };
  }

  if (trimmed.length < 3) {
    return { isValid: false, error: 'Subdomain must be at least 3 characters long' };
  }

  if (trimmed.length > 63) {
    return { isValid: false, error: 'Subdomain cannot be longer than 63 characters' };
  }

  // Check valid characters (lowercase letters, numbers, hyphens)
  if (!/^[a-z0-9-]+$/.test(trimmed)) {
    return { isValid: false, error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
  }

  // Cannot start or end with hyphen
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    return { isValid: false, error: 'Subdomain cannot start or end with a hyphen' };
  }

  // Cannot have consecutive hyphens
  if (trimmed.includes('--')) {
    return { isValid: false, error: 'Subdomain cannot contain consecutive hyphens' };
  }

  // Check if it's a reserved subdomain
  if (RESERVED_SUBDOMAINS.includes(trimmed.toLowerCase())) {
    return { isValid: false, error: 'This subdomain is reserved and cannot be used' };
  }

  return { isValid: true };
}

export function validateTenantName(name: string): ValidationResult {
  if (!name) {
    return { isValid: false, error: 'Tenant name is required' };
  }

  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Tenant name cannot be empty' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Tenant name must be at least 2 characters long' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Tenant name cannot be longer than 100 characters' };
  }

  return { isValid: true };
}

export function validateEmoji(emoji: string): ValidationResult {
  if (!emoji) {
    return { isValid: false, error: 'Emoji is required' };
  }

  const trimmed = emoji.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Emoji cannot be empty' };
  }

  if (trimmed.length > 10) {
    return { isValid: false, error: 'Emoji cannot be longer than 10 characters' };
  }

  try {
    // Check if the string contains at least one emoji character
    const emojiPattern = /[\p{Emoji}]/u;
    if (!emojiPattern.test(trimmed)) {
      return { isValid: false, error: 'Please enter a valid emoji' };
    }
  } catch (error) {
    // Fallback validation if Unicode property escapes are not supported
    if (trimmed.length < 1 || trimmed.length > 10) {
      return { isValid: false, error: 'Please enter a valid emoji (1-10 characters)' };
    }
  }

  return { isValid: true };
}