import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './supabase-config.js';
import { CLERK_PUBLISHABLE_KEY } from './clerk-config.js';

let clientPromise = null;
let clerkPromise = null;
let clerkUiPromise = null;
let linkedIdentity = null;
export const authRedirectUrl = (moduleUrl = import.meta.url) => new URL('../', moduleUrl).href;
export const AUTH_REDIRECT_URL = authRedirectUrl();
const UUID = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const CLERK_USER_ID = /^user_[A-Za-z0-9]+$/;
export const isClerkEnabled = () => Boolean(CLERK_PUBLISHABLE_KEY.trim());

export const isVerifiedEmailUser = (user) =>
  Boolean(user?.email && user.email_confirmed_at && user.is_anonymous !== true);

export const isVerifiedClerkUser = (user) =>
  Boolean(
    typeof user?.id === 'string'
    && CLERK_USER_ID.test(user.id)
    && user.primaryEmailAddress?.verification?.status === 'verified'
    && user.primaryEmailAddress.emailAddress
  );

function loadClerkUI(clerkDomain) {
  if (window.__internal_ClerkUICtor) {
    return Promise.resolve(window.__internal_ClerkUICtor);
  }
  if (!clerkUiPromise) {
    clerkUiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        const ClerkUI = window.__internal_ClerkUICtor;
        if (ClerkUI) resolve(ClerkUI);
        else reject(new Error('Clerk sign-in UI failed to initialize.'));
      };
      script.onerror = () => reject(new Error('Could not load Clerk sign-in UI. Check the Clerk Frontend API domain.'));
      document.head.appendChild(script);
    }).catch((error) => {
      clerkUiPromise = null;
      throw error;
    });
  }
  return clerkUiPromise;
}

export function getClerk() {
  if (!isClerkEnabled()) {
    throw new Error('Clerk is not configured. Add the production publishable key in clerk-config.js.');
  }
  if (!clerkPromise) {
    clerkPromise = import('https://esm.sh/@clerk/clerk-js@6.48.0').then(async ({ Clerk }) => {
      const publishableKey = CLERK_PUBLISHABLE_KEY.trim();
      const encodedDomain = publishableKey.split('_')[2];
      const clerkDomain = encodedDomain ? atob(encodedDomain).replace(/\$$/, '') : '';
      if (!/^[a-z\d.-]+$/i.test(clerkDomain)) {
        throw new Error('The Clerk publishable key has an invalid Frontend API domain.');
      }
      const ClerkUI = await loadClerkUI(clerkDomain);
      const clerk = new Clerk(publishableKey);
      await clerk.load({
        signInFallbackRedirectUrl: AUTH_REDIRECT_URL,
        signUpFallbackRedirectUrl: AUTH_REDIRECT_URL,
        afterSignOutUrl: AUTH_REDIRECT_URL,
        ui: { ClerkUI },
      });
      return clerk;
    }).catch((error) => {
      clerkPromise = null;
      throw error;
    });
  }
  return clerkPromise;
}

export function getSupabase() {
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2').then(({ createClient }) => {
      const auth = isClerkEnabled()
        ? { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
        : { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true };
      return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth,
        ...(isClerkEnabled() ? {
          accessToken: async () => {
            const clerk = await getClerk();
            return clerk.session ? clerk.session.getToken() : null;
          },
        } : {}),
      });
    });
  }
  return clientPromise;
}

async function linkClerkIdentity(clerk, user) {
  if (linkedIdentity?.clerkUserId === user.id) return linkedIdentity.promise;
  const promise = (async () => {
    const supabase = await getSupabase();
    const { data, error } = await supabase.functions.invoke('clerk-identity', { body: {} });
    if (error) {
      let detail = '';
      try {
        const response = await error.context?.clone?.().json();
        detail = typeof response?.error === 'string' ? response.error : '';
      } catch {
        detail = '';
      }
      throw new Error(detail || error.message || 'Could not link your Clerk account to your game data.');
    }
    if (!data?.ok || !UUID.test(data.userId || '')) {
      throw new Error(data?.error || 'The account service returned an invalid game account.');
    }
    return {
      user: {
        id: data.userId,
        email: user.primaryEmailAddress.emailAddress,
        email_confirmed_at: 'clerk-verified',
        is_anonymous: false,
        user_metadata: {
          username: user.username || '',
          full_name: user.fullName || '',
          name: user.firstName || '',
        },
        clerk_user_id: user.id,
      },
      access_token: await clerk.session.getToken(),
      provider: 'clerk',
    };
  })();
  linkedIdentity = { clerkUserId: user.id, promise };
  try {
    return await promise;
  } catch (error) {
    if (linkedIdentity?.clerkUserId === user.id) linkedIdentity = null;
    throw error;
  }
}

export async function ensureOnlineSession() {
  if (isClerkEnabled()) {
    const clerk = await getClerk();
    if (!isVerifiedClerkUser(clerk.user) || !clerk.session) {
      const error = new Error('Create an account or sign in with a verified email to continue.');
      error.code = 'EMAIL_LOGIN_REQUIRED';
      throw error;
    }
    return linkClerkIdentity(clerk, clerk.user);
  }

  const supabase = await getSupabase();
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (isVerifiedEmailUser(session?.user)) return session;
  const error = new Error('Create an account or sign in to continue.');
  error.code = 'EMAIL_LOGIN_REQUIRED';
  throw error;
}
