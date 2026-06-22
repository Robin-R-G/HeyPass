import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
  },
});

let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export const supabaseAdmin: ReturnType<typeof createClient<Database>> = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    if (typeof window !== 'undefined') {
      throw new Error('supabaseAdmin must not be used in client-side code');
    }
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    const value = (_supabaseAdmin as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(_supabaseAdmin) : value;
  },
});
