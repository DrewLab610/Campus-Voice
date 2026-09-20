/* ============================================================
   Campus-Voice — auth.js
   Handles signup.html and login.html. No email verification step —
   an account works the moment it's created. Also exposes
   CV.Auth.logout() and CV.Auth.requireStudent() for dashboard.html.
   ============================================================ */

(function () {

  /* ---------------- Signup ---------------- */

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    const msg = document.getElementById('signupMsg');

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
        CV.showMsg(msg, 'An account with this matric number already exists.', 'error');
        return;
      }

      const user = {
        name, matric, email: email.toLowerCase(),
        passwordHash: CV.obfuscate(password),
        createdAt: new Date().toISOString()
      };
      DB.saveUser(user);
      DB.logActivity(email, 'signup', `Account created for ${name} (${matric})`);
      DB.setSession(user.email);
      DB.logActivity(email, 'login', 'Logged in right after signup');

      window.location.href = 'dashboard.html';
    });
  }

  /* ---------------- Login ---------------- */

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const msg = document.getElementById('loginMsg');

    if (DB.currentUser()) {
      window.location.href = 'dashboard.html';
    }

    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      CV.hideMsg(msg);

      const email = document.getElementById('liEmail').value.trim();
      const password = document.getElementById('liPassword').value;

      const user = DB.findUserByEmail(email);
      if (!user || user.passwordHash !== CV.obfuscate(password)) {
        CV.showMsg(msg, 'Incorrect email or password.', 'error');
        return;
      }

      DB.setSession(user.email);
      DB.logActivity(user.email, 'login', 'Student logged in');
      window.location.href = 'dashboard.html';
    });

    /* ---- Forgot password (verified by matric number, no email needed) ---- */
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
        const matric = document.getElementById('fpMatric').value.trim();
        const newPassword = document.getElementById('fpNewPassword').value;

        const user = DB.findUserByEmail(email);
        if (!user || user.matric.toLowerCase() !== matric.toLowerCase()) {
          CV.showMsg(forgotMsg, 'Those details do not match any account.', 'error');
          return;
        }
        if (newPassword.length < 6) {
          CV.showMsg(forgotMsg, 'New password must be at least 6 characters.', 'error');
          return;
        }
        user.passwordHash = CV.obfuscate(newPassword);
        DB.saveUser(user);
        DB.logActivity(email, 'password_reset', 'Password reset via matric verification');
        CV.showMsg(forgotMsg, 'Password updated. You can log in now.', 'success');
        forgotForm.reset();
        setTimeout(() => {
          forgotCard.classList.add('hidden');
          loginForm.classList.remove('hidden');
        }, 1200);
      });
    }
  }

  /* ---------------- Shared: logout / page guard ---------------- */

  window.CV = window.CV || {};
  window.CV.Auth = {
    logout: function () {
      const user = DB.currentUser();
      if (user) DB.logActivity(user.email, 'logout', 'Student logged out');
      DB.clearSession();
      window.location.href = 'login.html';
    },
    requireStudent: function () {
      const user = DB.currentUser();
      if (!user) {
        window.location.href = 'login.html';
        return null;
      }
      return user;
    }
  };
})();
