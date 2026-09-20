/* ============================================================
   Campus-Voice — utils.js
   Small, dependency-free helpers shared by every page.
   ============================================================ */

const CV = (function () {

  function makeId(prefix) {
    const rand = Math.random().toString(36).slice(2, 9);
    return `${prefix}_${Date.now().toString(36)}${rand}`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-NG', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * NOT real cryptographic hashing — there is no server here to keep a
   * secret salt on, so this only keeps a password from sitting in
   * localStorage as plain readable text. Good enough for a local demo
   * app; not a substitute for real auth in anything that matters.
   */
  function obfuscate(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return 'v1_' + Math.abs(h).toString(36) + '_' + btoa(unescape(encodeURIComponent(str))).split('').reverse().join('');
  }

  function badgeClass(status) {
    switch (status) {
      case 'Approved': return 'badge-approved';
      case 'In Progress': return 'badge-progress';
      case 'Resolved': return 'badge-resolved';
      case 'Rejected': return 'badge-rejected';
      default: return 'badge-submitted';
    }
  }

  function borderClass(status) {
    switch (status) {
      case 'Approved': return 'border-approved';
      case 'In Progress': return 'border-progress';
      case 'Resolved': return 'border-resolved';
      case 'Rejected': return 'border-rejected';
      default: return 'border-submitted';
    }
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

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) { resolve(''); return; }
      if (file.size > 1.5 * 1024 * 1024) {
        reject(new Error('Attachment is too large (max 1.5MB).'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.readAsDataURL(file);
    });
  }

  return { makeId, formatDate, escapeHtml, obfuscate, badgeClass, borderClass, showMsg, hideMsg, isValidEmail, fileToBase64 };
})();

// Explicitly expose CV on window so other scripts (auth.js) can safely
// attach more properties to the SAME object — a plain top-level `const`
// does not otherwise become a property of `window`, which was silently
// breaking CV.Auth for every page that used it.
window.CV = CV;
