import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabase-config.js';

let clientPromise = null;
export const isVerifiedEmailUser = (user) =>
  Boolean(user?.email && user.email_confirmed_at && user.is_anonymous !== true);

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
      })
    );
  }
  return clientPromise;
}

export async function ensureOnlineSession() {
  const supabase = await getSupabase();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (isVerifiedEmailUser(session?.user)) return session;
  const error = new Error('Sign in with email to play online.');
  error.code = 'EMAIL_LOGIN_REQUIRED';
  throw error;
}
