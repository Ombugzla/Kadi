import { getSupabase, ensureOnlineSession, isVerifiedEmailUser } from './supabase-client.js';
import { $, esc, sheet, closeSheet, toast } from './ui.js';

export async function showEmailAccount() {
  let supabase;
  try {
    supabase = await getSupabase();
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (isVerifiedEmailUser(session?.user)) {
      const sh = sheet(`<h2>Email account</h2>
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
        toast('Signed out of online play');
      };
      return;
    }
    openEmailSignIn(supabase);
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
    await showEmailAccount();
    return false;
  }
}

function openEmailSignIn(supabase) {
  const sh = sheet(`<h2>Email sign-in</h2>
    <p>Enter your email and we’ll send a secure sign-in link. New users can create an account with the same step.</p>
    <input class="email-input" id="accountEmail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" required>
    <p class="note-sm" id="accountStatus" aria-live="polite"></p>
    <div class="row"><button class="btn grey" id="accountCancel">Cancel</button><button class="btn" id="accountSend">Send sign-in link</button></div>`);
  const emailInput = $('#accountEmail', sh.el);
  const status = $('#accountStatus', sh.el);
  const send = async () => {
    const email = emailInput.value.trim().toLowerCase();
    if (!emailInput.checkValidity() || !email) {
      emailInput.reportValidity();
      return;
    }
    emailInput.disabled = true;
    $('#accountSend', sh.el).disabled = true;
    status.textContent = 'Sending sign-in link…';
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${location.origin}${location.pathname}`,
        },
      });
      if (error) throw error;
      status.textContent = 'Check your email and open the sign-in link on this device. Then return here to play online.';
      $('#accountSend', sh.el).textContent = 'Link sent';
    } catch (error) {
      status.textContent = error.message || 'Could not send the sign-in link. Try again.';
      emailInput.disabled = false;
      $('#accountSend', sh.el).disabled = false;
    }
  };
  $('#accountSend', sh.el).onclick = send;
  emailInput.onkeydown = (event) => {
    if (event.key === 'Enter') send();
  };
  $('#accountCancel', sh.el).onclick = () => closeSheet();
  emailInput.focus();
}
