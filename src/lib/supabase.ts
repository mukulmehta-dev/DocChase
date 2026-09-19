import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const procEnv = (globalThis as any).process?.env;

const supabaseUrl = metaEnv?.VITE_SUPABASE_URL || procEnv?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv?.VITE_SUPABASE_ANON_KEY || procEnv?.VITE_SUPABASE_ANON_KEY || '';

export const isProduction = (): boolean => {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const procEnv = (globalThis as any).process?.env;
  return Boolean(metaEnv?.PROD || procEnv?.NODE_ENV === 'production');
};

export const CONFIG_ERROR_MESSAGE =
  'DocChase is not configured correctly. Supabase environment variables are missing.';

// Detect if valid custom Supabase project credentials are provided
export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('placeholder.supabase.co') &&
    supabaseUrl.startsWith('https://')
  );
};

export const assertProductionConfigured = (forceProd?: boolean): void => {
  const prod = forceProd !== undefined ? forceProd : isProduction();
  if (prod && !isSupabaseConfigured()) {
    throw new Error(CONFIG_ERROR_MESSAGE);
  }
};

// Create the official Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
