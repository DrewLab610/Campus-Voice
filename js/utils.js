/* ============================================================
   Campus-Voice — utils.js
   Small, dependency-free helpers shared by every page.
   ============================================================ */

const CV = (function () {

  /** Generate a reasonably-unique id for client-side use. */
  function makeId(prefix) {
    const rand = Math.random().toString(36).slice(2, 9);
    return `${prefix}_${Date.now().toString(36)}${rand}`;
  }

  /** Format an ISO timestamp for on-screen display. */
  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /** Escape text before inserting into innerHTML, to avoid markup injection. */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function badgeClass(status) {
    if (status === 'In Progress') return 'badge-progress';
    if (status === 'Resolved') return 'badge-resolved';
    return 'badge-submitted';
  }

  function borderClass(status) {
    if (status === 'In Progress') return 'border-progress';
    if (status === 'Resolved') return 'border-resolved';
    return 'border-submitted';
  }

  function showMsg(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-msg show ' + (type || 'info');
  }

  function hideMsg(el) {
    if (!el) return;
    el.className = 'form-msg';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Read a File object as a base64 data URL, resolving '' if none given. */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) { resolve(''); return; }
      if (file.size > 1.5 * 1024 * 1024) {
        reject(new Error('Attachment is too large (max 1.5MB in this build).'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Turn a raw Error into something readable for a student, without
   * leaking internal detail. Falls back to a generic message when the
   * error doesn't match a known case.
   */
  function friendlyError(error) {
    if (!error) return 'Something went wrong. Please try again.';
    const m = (error.message || '').toLowerCase();
    if (m.includes('matric') && m.includes('registered')) return 'That matric number is already registered.';
    if (m.includes('email') && m.includes('registered')) return 'An account with this email already exists.';
    if (m.includes('incorrect email or password')) return 'Incorrect email or password.';
    if (m.includes('password must be at least')) return 'Password must be at least 6 characters.';
    if (m.includes('quotaexceedederror') || m.includes('quota')) return 'Storage is full in this browser — try clearing some space.';
    return error.message || 'Something went wrong. Please try again.';
  }

  return {
    makeId, formatDate, escapeHtml, badgeClass, borderClass,
    showMsg, hideMsg, isValidEmail, fileToBase64, friendlyError
  };
})();
