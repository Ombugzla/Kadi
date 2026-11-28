import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyClerkSessionToken } from '../_shared/clerk.ts';

type ClerkUserProfile = {
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses: {
    id: string;
    email_address: string;
    verification?: { status?: string } | null;
  }[];
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Sign in with Clerk to link your game account.' }, 401);

  const url = Deno.env.get('SUPABASE_URL')?.trim();
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  const secretKey = Deno.env.get('CLERK_SECRET_KEY')?.trim();
  const jwtKey = Deno.env.get('CLERK_JWT_KEY')?.trim();
  if (!url || !serviceKey || !secretKey || !jwtKey || !Deno.env.get('CLERK_AUTHORIZED_PARTIES')) {
    return json({ error: 'Clerk account linking is not configured on the server.' }, 503);
  }
  if (!/^[\x21-\x7e]+$/.test(secretKey)) {
    return json({ error: 'The Clerk server key is malformed.' }, 503);
  }

  let stage = 'verifying the Clerk session';
  try {
    const claims = await verifyClerkSessionToken(token);
    stage = 'fetching the Clerk user profile';
    const profileResponse = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(claims.sub)}`,
      { headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' } },
    );
    if (!profileResponse.ok) {
      throw new Error(`Clerk user profile request returned HTTP ${profileResponse.status}.`);
    }
    const clerkUser = await profileResponse.json() as ClerkUserProfile;
    if (!Array.isArray(clerkUser.email_addresses)) {
      throw new Error('Clerk returned an invalid user profile.');
    }
    const primaryEmail = clerkUser.email_addresses.find(
      (email) => email.id === clerkUser.primary_email_address_id,
    );
    if (!primaryEmail?.email_address || primaryEmail.verification?.status !== 'verified') {
      return json({ error: 'Verify your primary email address with Clerk before continuing.' }, 403);
    }

    const email = primaryEmail.email_address.trim().toLowerCase();
    const fullName = [clerkUser.first_name, clerkUser.last_name].filter(Boolean).join(' ');
    const usernameSource = clerkUser.username || fullName
      || email.split('@')[0];
    const username = usernameSource.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'Player';
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    stage = 'looking up the existing game account';
    const { data: linkedId, error: linkedLookupError } = await admin.rpc('resolve_clerk_auth_user', {
      p_clerk_user_id: claims.sub,
    });
    if (linkedLookupError) throw linkedLookupError;

    let authUserId: string | null = typeof linkedId === 'string' && UUID.test(linkedId) ? linkedId : null;
    if (!authUserId) {
      const { data, error } = await admin.rpc('find_auth_user_id_for_clerk_email', {
        p_email: email,
      });
      if (error) throw error;
      authUserId = typeof data === 'string' && UUID.test(data) ? data : null;
    }

    if (authUserId) {
      stage = 'checking the existing game account';
      const { data, error } = await admin.auth.admin.getUserById(authUserId);
      if (error) throw error;
      if (data.user.email?.toLowerCase() !== email || !data.user.email_confirmed_at) {
        const { error: updateError } = await admin.auth.admin.updateUserById(authUserId, {
          email,
          email_confirm: true,
        });
        if (updateError) throw updateError;
      }
    } else {
      stage = 'creating the game account';
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { username },
      });
      if (error) {
        const { data: racedId, error: lookupError } = await admin.rpc('find_auth_user_id_for_clerk_email', {
          p_email: email,
        });
        if (lookupError) throw lookupError;
        if (typeof racedId !== 'string' || !UUID.test(racedId)) throw error;
        authUserId = racedId;
      } else {
        authUserId = data.user.id;
      }
    }
    if (!authUserId) throw new Error('The game account could not be resolved.');

    stage = 'saving the Clerk identity link';
    const { data: userId, error: linkError } = await admin.rpc('link_clerk_identity', {
      p_clerk_user_id: claims.sub,
      p_auth_user_id: authUserId,
      p_email: email,
    });
    if (linkError) throw linkError;
    if (typeof userId !== 'string' || !UUID.test(userId)) {
      throw new Error('The identity service returned an invalid game account.');
    }
    return json({ ok: true, userId });
  } catch (error) {
    console.error(`Clerk identity sync failed while ${stage}:`, error);
    return json({ error: 'Could not link your Clerk identity to a game account. Please retry.' }, 500);
  }
});
