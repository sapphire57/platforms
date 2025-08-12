// Centralized error handling utilities

export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

export class TenantError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'TENANT_ERROR', details?: any) {
    super(message);
    this.name = 'TenantError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends Error {
  code: string;
  field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.field = field;
  }
}

export class AuthorizationError extends Error {
  code: string;

  constructor(message: string = 'Unauthorized access') {
    super(message);
    this.name = 'AuthorizationError';
    this.code = 'AUTHORIZATION_ERROR';
  }
}

export function handleDatabaseError(error: any): AppError {
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        if (error.constraint?.includes('subdomain')) {
          return { message: 'This subdomain is already taken', code: 'SUBDOMAIN_EXISTS' };
        }
        return { message: 'This value already exists', code: 'DUPLICATE_ERROR' };
      
      case '23503': // Foreign key violation
        return { message: 'Invalid reference to related data', code: 'FOREIGN_KEY_ERROR' };
      
      case '42P17': // Infinite recursion (RLS policy issue)
        return { message: 'Database configuration error', code: 'POLICY_ERROR' };
      
      case 'PGRST116': // No rows returned
        return { message: 'Resource not found', code: 'NOT_FOUND' };
      
      case '42501': // Insufficient privilege
        return { message: 'Insufficient permissions', code: 'PERMISSION_DENIED' };
      
      default:
        console.error('Unhandled database error:', error);
        return { message: 'Database operation failed', code: 'DATABASE_ERROR', details: error };
    }
  }

  return { message: error.message || 'Unknown database error', code: 'UNKNOWN_ERROR' };
}

export function handleSupabaseError(error: any): AppError {
  if (error.message) {
    // Handle common Supabase auth errors
    if (error.message.includes('Invalid login credentials')) {
      return { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };
    }
    
    if (error.message.includes('Email not confirmed')) {
      return { message: 'Please check your email and confirm your account', code: 'EMAIL_NOT_CONFIRMED' };
    }
    
    if (error.message.includes('User already registered')) {
      return { message: 'An account with this email already exists', code: 'USER_EXISTS' };
    }
  }

  return handleDatabaseError(error);
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext?: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`Error in ${errorContext || 'operation'}:`, error);
    
    if (error instanceof TenantError || error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error;
    }
    
    const appError = handleSupabaseError(error);
    throw new TenantError(appError.message, appError.code, appError.details);
  }
}