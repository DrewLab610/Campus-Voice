/* ============================================================
   Campus-Voice — auth.js (local, no backend)
   Handles signup.html and login.html against DB (localStorage).
   Also exposes CV.Auth.logout() and CV.Auth.requireStudent() for
   dashboard.html.

   There's no mail server here, so there's no email verification step
   and "forgot password" just asks for the email + a new password
   directly, instead of emailing a reset link.
   ============================================================ */

(function () {

  /* ---------------- Signup ---------------- */

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    const msg = document.getElementById('signupMsg');
    const doneCard = document.getElementById('verifyCard');
    const doneEmailLabel = document.getElementById('verifyEmailLabel');

    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      CV.hideMsg(msg);

      const name = document.getElementById('suName').value.trim();
      const matric = document.getElementById('suMatric').value.trim();
      const email = document.getElementById('suEmail').value.trim();
      const password = document.getElementById('suPassword').value;
      const confirm = document.getElementById('suConfirm').value;

      if (!name || !matric || !email || !password) {
        CV.showMsg(msg, 'Please fill in every field.', 'error');
        return;
      }
      if (!CV.isValidEmail(email)) {
        CV.showMsg(msg, 'Enter a valid email address.', 'error');
        return;
      }
      if (password.length < 6) {
        CV.showMsg(msg, 'Password must be at least 6 characters.', 'error');
        return;
      }
      if (password !== confirm) {
        CV.showMsg(msg, 'Passwords do not match.', 'error');
        return;
      }
      if (DB.findUserByEmail(email)) {
        CV.showMsg(msg, 'An account with this email already exists.', 'error');
        return;
      }
      if (DB.findUserByMatric(matric)) {
        CV.showMsg(msg, 'That matric number is already registered.', 'error');
        return;
      }

      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account…';

      let user;
      try {
        user = DB.createUser({ name, matric, email, password });
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign up';
        CV.showMsg(msg, CV.friendlyError(err), 'error');
        return;
      }

      DB.logActivity(user.id, user.email, 'signup', 'Account created');

      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign up';

      signupForm.classList.add('hidden');
      doneEmailLabel.textContent = email;
      doneCard.classList.remove('hidden');
    });
  }

  /* ---------------- Login ---------------- */

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const msg = document.getElementById('loginMsg');

    (function redirectIfAlreadySignedIn() {
      if (DB.getSession()) window.location.href = 'dashboard.html';
    })();

    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      CV.hideMsg(msg);

      const email = document.getElementById('liEmail').value.trim();
      const password = document.getElementById('liPassword').value;

      const submitBtn = loginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in…';

      const user = DB.findUserByEmail(email);
      const ok = DB.verifyPassword(user, password);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';

      if (!ok) {
        CV.showMsg(msg, 'Incorrect email or password.', 'error');
        return;
      }

      DB.setSession(user.id);
      await DB.logActivity(user.id, user.email, 'login', 'Student logged in');
      window.location.href = 'dashboard.html';
    });

    /* ---- Forgot password (resets directly — no email involved) ---- */
    const forgotLink = document.getElementById('forgotLink');
    const forgotCard = document.getElementById('forgotCard');
    const forgotForm = document.getElementById('forgotForm');
    const forgotMsg = document.getElementById('forgotMsg');
    const cancelForgot = document.getElementById('cancelForgot');

    if (forgotLink) {
      forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        loginForm.classList.add('hidden');
        forgotCard.classList.remove('hidden');
      });
    }
    if (cancelForgot) {
      cancelForgot.addEventListener('click', function () {
        forgotCard.classList.add('hidden');
        loginForm.classList.remove('hidden');
      });
    }
    if (forgotForm) {
      forgotForm.addEventListener('submit', function (e) {
        e.preventDefault();
        CV.hideMsg(forgotMsg);

        const email = document.getElementById('fpEmail').value.trim();
        const p1 = document.getElementById('fpPassword').value;
        const p2 = document.getElementById('fpConfirm').value;

        if (!CV.isValidEmail(email)) {
          CV.showMsg(forgotMsg, 'Enter a valid email address.', 'error');
          return;
        }
        if (p1.length < 6) {
          CV.showMsg(forgotMsg, 'New password must be at least 6 characters.', 'error');
          return;
        }
        if (p1 !== p2) {
          CV.showMsg(forgotMsg, 'Passwords do not match.', 'error');
          return;
        }

        const btn = forgotForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Updating…';

        const found = DB.setPassword(email, p1);

        btn.disabled = false;
        btn.textContent = 'Update password';

        // Don't reveal whether the email exists, same spirit as a real
        // "check your inbox" message — but the password is genuinely
        // set immediately when it does.
        CV.showMsg(forgotMsg, 'If that email has an account, its password has been updated. You can log in now.', 'success');
        if (found) forgotForm.reset();
      });
    }
  }

  /* ---------------- Shared: logout / page guard ---------------- */

  window.CV = window.CV || {};
  window.CV.Auth = {
    logout: async function () {
      const profile = await DB.getMyProfile();
      if (profile) await DB.logActivity(profile.id, profile.email, 'logout', 'Student logged out');
      DB.clearSession();
      window.location.href = 'login.html';
    },
    /**
     * Redirects to login.html if nobody is signed in. Otherwise returns
     * { authUser, profile }. Await this before rendering anything that
     * depends on session state, so a logged-out visit never touches
     * complaint data.
     */
    requireStudent: async function () {
      if (!DB.getSession()) {
        window.location.href = 'login.html';
        return null;
      }
      const profile = await DB.getMyProfile();
      if (!profile) {
        DB.clearSession();
        window.location.href = 'login.html';
        return null;
      }
      return { authUser: { id: profile.id, email: profile.email }, profile };
    }
  };
})();
