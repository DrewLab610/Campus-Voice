/* ============================================================
   Campus-Voice — db.js
   Everything the app needs lives in the browser's localStorage.
   No network calls, no external service, nothing that can fail to
   deliver an email or get blocked by a remote policy — every
   function here is synchronous and works the instant the page loads.
   ============================================================ */

const DB = (function () {
  const K_USERS = 'cv_users';
  const K_COMPLAINTS = 'cv_complaints';
  const K_ACTIVITY = 'cv_activity';
  const K_SESSION = 'cv_session';
  const K_ADMIN_SESSION = 'cv_admin_session';

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('Campus-Voice: could not read', key, e);
      return fallback;
    }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* ---------------- Users ---------------- */

  function getUsers() { return read(K_USERS, {}); }

  function saveUser(user) {
    const users = getUsers();
    users[user.email.toLowerCase()] = user;
    write(K_USERS, users);
  }

  function findUserByEmail(email) {
    if (!email) return null;
    return getUsers()[email.toLowerCase()] || null;
  }

  function findUserByMatric(matric) {
    if (!matric) return null;
    return Object.values(getUsers()).find(
      u => u.matric.toLowerCase() === matric.toLowerCase()
    ) || null;
  }

  /* ---------------- Student session ---------------- */

  function setSession(email) { write(K_SESSION, { email: email.toLowerCase() }); }
  function getSession() { return read(K_SESSION, null); }
  function clearSession() { localStorage.removeItem(K_SESSION); }

  function currentUser() {
    const s = getSession();
    if (!s) return null;
    const user = findUserByEmail(s.email);
    if (!user) { clearSession(); return null; }
    return user;
  }

  /* ---------------- Admin session ---------------- */

  function setAdminSession(on) {
    if (on) write(K_ADMIN_SESSION, { at: new Date().toISOString() });
    else localStorage.removeItem(K_ADMIN_SESSION);
  }
  function isAdminLoggedIn() { return !!read(K_ADMIN_SESSION, null); }

  /* ---------------- Complaints ---------------- */

  function getAllComplaints() { return read(K_COMPLAINTS, []); }
  function saveAllComplaints(list) { write(K_COMPLAINTS, list); }

  function getComplaintsForUser(email) {
    return getAllComplaints()
      .filter(c => c.studentEmail.toLowerCase() === email.toLowerCase())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getComplaintById(id) {
    return getAllComplaints().find(c => c.id === id) || null;
  }

  function addComplaint(complaint) {
    const list = getAllComplaints();
    list.push(complaint);
    saveAllComplaints(list);
    return complaint;
  }

  /** newStatus one of: Approved | In Progress | Resolved | Rejected */
  function updateComplaintStatus(id, newStatus, note, actor) {
    const list = getAllComplaints();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return null;
    list[idx].status = newStatus;
    list[idx].statusHistory.push({
      status: newStatus,
      note: note || '',
      actor: actor || 'Admin',
      timestamp: new Date().toISOString()
    });
    saveAllComplaints(list);
    return list[idx];
  }

  /* ---------------- Activity log ---------------- */

  function logActivity(email, action, detail) {
    const list = read(K_ACTIVITY, []);
    list.push({
      id: CV.makeId('act'),
      email: (email || '').toLowerCase(),
      action,
      detail: detail || '',
      timestamp: new Date().toISOString()
    });
    write(K_ACTIVITY, list);
  }

  /* ---------------- Stats ---------------- */

  function computeStats() {
    const all = getAllComplaints();
    const stats = {
      total: all.length,
      submitted: all.filter(c => c.status === 'Submitted').length,
      approved: all.filter(c => c.status === 'Approved').length,
      inProgress: all.filter(c => c.status === 'In Progress').length,
      resolved: all.filter(c => c.status === 'Resolved').length,
      rejected: all.filter(c => c.status === 'Rejected').length,
      byCategory: {}
    };
    all.forEach(c => { stats.byCategory[c.category] = (stats.byCategory[c.category] || 0) + 1; });
    return stats;
  }

  /* ---------------- Bootstrap the fixed admin account ---------------- */
  /** Ensures a default admin login exists the first time the app runs. */
  function ensureDefaultAdmin() {
    const ADMIN_KEY = 'cv_admin_creds';
    if (!localStorage.getItem(ADMIN_KEY)) {
      write(ADMIN_KEY, { username: 'admin', passwordHash: CV.obfuscate('admin123') });
    }
    return read(ADMIN_KEY, null);
  }
  function getAdminCreds() { return read('cv_admin_creds', null); }

  return {
    getUsers, saveUser, findUserByEmail, findUserByMatric,
    setSession, getSession, clearSession, currentUser,
    setAdminSession, isAdminLoggedIn,
    getAllComplaints, getComplaintsForUser, getComplaintById, addComplaint, updateComplaintStatus,
    logActivity, computeStats,
    ensureDefaultAdmin, getAdminCreds
  };
})();
