import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
  },
});

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export const supabaseAdmin: ReturnType<typeof createClient> = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (typeof window !== 'undefined') {
      throw new Error('supabaseAdmin must not be used in client-side code');
    }
    if (!_supabaseAdmin) {
      _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
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
