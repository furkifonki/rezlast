import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// createBrowserClient stores the session in cookies, so the server side
// middleware (which reads cookies) can see the logged in user.
// The old createClient from supabase-js stored it in localStorage only,
// which made the middleware send users back to /login after a successful login.
export const supabase =
  supabaseUrl && supabaseKey
    ? createBrowserClient(supabaseUrl, supabaseKey)
    : null;
