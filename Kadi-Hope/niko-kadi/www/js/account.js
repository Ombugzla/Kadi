import * as store from './store.js';
import {
  AUTH_REDIRECT_URL,
  getSupabase,
  ensureOnlineSession,
  isVerifiedEmailUser,
} from './supabase-client.js';
import { $, $$, esc, sheet, closeSheet, toast } from './ui.js';

let accountGateActive = false;

export const isAccountGateActive = () => accountGateActive;

function usernameFor(user) {
  const metadata = user?.user_metadata || {};
  const name = [metadata.username, metadata.full_name, metadata.name, metadata.preferred_username]
    .find((value) => typeof value === 'string' && value.trim());
  return (name || user?.email?.split('@')[0] || '').trim().slice(0, 24);
}

function saveLocalUsername(user, preferredUsername = '') {
  const username = preferredUsername.trim().slice(0, 24) || usernameFor(user);
  if (!username) return;
  const profile = store.get();
  if (preferredUsername || profile.name === 'You') profile.name = username;
  store.save();
}

function completeAccount(user, preferredUsername, onAuthenticated) {
  saveLocalUsername(user, preferredUsername);
  accountGateActive = false;
  closeSheet(true);
  onAuthenticated?.();
}

export async function showAccountGate(onAuthenticated) {
  accountGateActive = true;
  let supabase;
  try {
    supabase = await getSupabase();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (isVerifiedEmailUser(session?.user)) {
      completeAccount(session.user, '', onAuthenticated);
      return;
    }
  } catch (error) {
    const sh = sheet(`<h2>Account required</h2>
      <p>Connect to Niko Kadi Games to create or sign in to your account.</p>
      <p class="note-sm" id="accountConnectionError">${esc(error.message || 'Could not connect to the account service.')}</p>
      <div class="row"><button class="btn block" id="accountRetry">Try again</button></div>`, { center: true, dismiss: false });
    $('#accountRetry', sh.el).onclick = () => { void showAccountGate(onAuthenticated); };
    return;
  }
  openAccountForm(supabase, onAuthenticated);
}

export async function showEmailAccount() {
  try {
    const supabase = await getSupabase();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (isVerifiedEmailUser(session?.user)) {
      const sh = sheet(`<h2>Account</h2>
        <p>Signed in as <b>${esc(session.user.email)}</b>. Your account is used for online rooms and player search.</p>
        <div class="row"><button class="btn grey" id="accountClose">Close</button><button class="btn danger" id="accountSignOut">Sign out</button></div>`);
      $('#accountClose', sh.el).onclick = () => closeSheet();
      $('#accountSignOut', sh.el).onclick = async () => {
        const button = $('#accountSignOut', sh.el);
        button.disabled = true;
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          button.disabled = false;
          toast(signOutError.message || 'Could not sign out.');
          return;
        }
        closeSheet(true);
        await showAccountGate(() => {});
      };
      return;
    }
    await showAccountGate(() => {});
  } catch (error) {
    toast(error.message || 'Could not open email sign-in.');
  }
}

export async function requireEmailAccount() {
  try {
    await ensureOnlineSession();
    return true;
  } catch (error) {
    if (error.code !== 'EMAIL_LOGIN_REQUIRED') throw error;
    await showAccountGate(() => {});
    return false;
  }
}

function openAccountForm(supabase, onAuthenticated) {
  const sh = sheet(`<h2>Welcome to Niko Kadi Games</h2>
    <p>Create an account or sign in to continue.</p>
    <div class="seg" id="accountModes"><button data-mode="create" class="on">Create account</button><button data-mode="signin">Sign in</button></div>
    <div class="account-provider"><button class="btn grey block" id="accountGoogle"><span class="google-g" aria-hidden="true">G</span><span>Continue with Google</span></button></div>
    <div id="accountFields"></div>
    <p class="note-sm" id="accountStatus" aria-live="polite"></p>`, { center: true, dismiss: false });
  sh.el.classList.add('account-sheet');
  const status = $('#accountStatus', sh.el);
  const fields = $('#accountFields', sh.el);
  let mode = 'create';

  const renderFields = () => {
    fields.innerHTML = `${mode === 'create' ? `<label for="accountUsername">Username</label>
      <input id="accountUsername" type="text" minlength="3" maxlength="24" autocomplete="username" placeholder="Choose a username" required>` : ''}
      <label for="accountEmail">Email</label>
      <input id="accountEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
      <label for="accountPassword">Password</label>
      <input id="accountPassword" type="password" ${mode === 'create' ? 'minlength="8"' : ''} autocomplete="${mode === 'create' ? 'new-password' : 'current-password'}" placeholder="${mode === 'create' ? 'At least 8 characters' : 'Your password'}" required>
      <div class="row"><button class="btn block" id="accountSubmit">${mode === 'create' ? 'Create account' : 'Sign in'}</button></div>
      ${mode === 'signin' ? '<button class="linkbtn" id="accountMagicLink">Email me a sign-in link</button>' : ''}`;
    $('#accountSubmit', sh.el).onclick = () => { void submit(); };
    $('#accountPassword', sh.el).onkeydown = (event) => {
      if (event.key === 'Enter') void submit();
    };
    const magicLink = $('#accountMagicLink', sh.el);
    if (magicLink) magicLink.onclick = () => { void sendSignInLink(); };
  };

  const submit = async () => {
    const usernameInput = $('#accountUsername', sh.el);
    const emailInput = $('#accountEmail', sh.el);
    const passwordInput = $('#accountPassword', sh.el);
    if (usernameInput) {
      usernameInput.value = usernameInput.value.trim();
      if (usernameInput.value.length < 3) {
        status.textContent = 'Username must be at least 3 characters.';
        usernameInput.focus();
        return;
      }
      if (!usernameInput.checkValidity()) {
        usernameInput.reportValidity();
        return;
      }
    }
    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }
    if (!passwordInput.checkValidity()) {
      passwordInput.reportValidity();
      return;
    }

    const username = usernameInput?.value.trim() || '';
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const submitButton = $('#accountSubmit', sh.el);
    submitButton.disabled = true;
    status.textContent = mode === 'create' ? 'Creating your account…' : 'Signing in…';
    try {
      if (mode === 'create') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: AUTH_REDIRECT_URL,
          },
        });
        if (error) throw error;
        if (data.user) saveLocalUsername(data.user, username);
        if (isVerifiedEmailUser(data.user)) {
          completeAccount(data.user, username, onAuthenticated);
          return;
        }
        status.textContent = `Check ${email} for a confirmation link. Open it to finish creating your account and return to Niko Kadi Games.`;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!isVerifiedEmailUser(data.user)) throw new Error('Confirm your email address before signing in.');
        completeAccount(data.user, '', onAuthenticated);
      }
    } catch (error) {
      status.textContent = error.message || 'Could not complete account sign-in. Please try again.';
    } finally {
      if (accountGateActive) submitButton.disabled = false;
    }
  };

  const sendSignInLink = async () => {
    const emailInput = $('#accountEmail', sh.el);
    if (!emailInput.checkValidity()) {
      emailInput.reportValidity();
      return;
    }
    const button = $('#accountMagicLink', sh.el);
    button.disabled = true;
    status.textContent = 'Sending sign-in link…';
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.value.trim().toLowerCase(),
        options: { shouldCreateUser: false, emailRedirectTo: AUTH_REDIRECT_URL },
      });
      if (error) throw error;
      status.textContent = `Check ${emailInput.value.trim()} for a sign-in link.`;
    } catch (error) {
      status.textContent = error.message || 'Could not send a sign-in link.';
      button.disabled = false;
    }
  };

  $$('#accountModes button', sh.el).forEach((button) => {
    button.onclick = () => {
      mode = button.dataset.mode;
      $$('#accountModes button', sh.el).forEach((item) => item.classList.toggle('on', item === button));
      status.textContent = '';
      renderFields();
      $('#accountUsername', sh.el)?.focus();
      if (mode === 'signin') $('#accountEmail', sh.el)?.focus();
    };
  });
  $('#accountGoogle', sh.el).onclick = async () => {
    const button = $('#accountGoogle', sh.el);
    button.disabled = true;
    status.textContent = 'Connecting to Google…';
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: AUTH_REDIRECT_URL,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch (error) {
      status.textContent = error.message || 'Could not sign in with Google.';
      button.disabled = false;
    }
  };
  renderFields();
  $('#accountUsername', sh.el)?.focus();
}
