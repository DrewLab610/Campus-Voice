/* ============================================================
   Campus-Voice — db.js (local, no backend)
   Replaces the old Supabase-backed version. Everything lives in the
   browser's localStorage under one JSON blob, so the whole app works
   fully offline / as a static site with zero server. All functions
   keep the same names and shapes as before (still `async`) so
   dashboard.js and admin.js don't need to know the storage changed.

   NOTE ON SECURITY: there is no real backend here, so there is no
   real security either. Passwords are only lightly obscured (not
   securely hashed) and every "student can only see their own
   complaints" rule is enforced in this JavaScript, not by a database
   — anyone comfortable in devtools could bypass it. That's fine for
   a demo / coursework project; don't reuse this pattern for anything
   that holds real user data.
   ============================================================ */

const DB = (function () {
  const STORE_KEY = 'cv_db_v1';
  const SESSION_KEY = 'cv_session_v1';
  const ADMIN_SESSION_KEY = 'cv_admin_session_v1';

  /* ---------------- storage plumbing ---------------- */

  function emptyDb() {
    return { users: [], complaints: [], activity: [] };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return emptyDb();
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        complaints: Array.isArray(parsed.complaints) ? parsed.complaints : [],
        activity: Array.isArray(parsed.activity) ? parsed.activity : []
      };
    } catch (e) {
      console.error('Campus-Voice: could not read local data, starting fresh', e);
      return emptyDb();
    }
  }

  function save(db) {
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  // Not cryptographic — just avoids storing raw passwords as plain text.
  // Good enough for a client-only demo with no server to attack.
  function obscure(str) {
    let hash = 0;
    const s = String(str);
    for (let i = 0; i < s.length; i++) {
      hash = ((hash << 5) - hash) + s.charCodeAt(i);
      hash |= 0;
    }
    return 'h' + hash + '_' + s.length;
  }

  /* ---------------- student session ---------------- */

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (e) {
      return null;
    }
  }
  function setSession(userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }));
  }
  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ---------------- admin session ---------------- */

  function getAdminSession() {
    return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
  }
  function setAdminSession() {
    localStorage.setItem(ADMIN_SESSION_KEY, '1');
  }
  function clearAdminSession() {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }

  /* ---------------- users / auth ---------------- */

  function findUserByEmail(email) {
    const db = load();
    return db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
  }

  function findUserByMatric(matric) {
    const db = load();
    return db.users.find(u => u.matric.toLowerCase() === String(matric).toLowerCase()) || null;
  }

  function createUser({ name, matric, email, password }) {
    const db = load();
    const user = {
      id: uid('user'),
      name,
      matric,
      email,
      passwordHash: obscure(password),
      role: 'student',
      created_at: new Date().toISOString()
    };
    db.users.push(user);
    save(db);
    return user;
  }

  function verifyPassword(user, password) {
    return !!user && user.passwordHash === obscure(password);
  }

  function setPassword(email, newPassword) {
    const db = load();
    const u = db.users.find(x => x.email.toLowerCase() === String(email).toLowerCase());
    if (!u) return false;
    u.passwordHash = obscure(newPassword);
    save(db);
    return true;
  }

  /** The signed-in student's own profile row, or null if nobody is signed in. */
  async function getMyProfile() {
    const session = getSession();
    if (!session) return null;
    const db = load();
    return db.users.find(u => u.id === session.userId) || null;
  }

  /* ---------------- complaints ---------------- */

  async function getComplaintsForUser(studentId) {
    const db = load();
    return db.complaints
      .filter(c => c.student_id === studentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /** Returns every complaint — only admin.js calls this. */
  async function getAllComplaints() {
    const db = load();
    return db.complaints.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function getComplaintById(id) {
    const db = load();
    const c = db.complaints.find(x => x.id === id);
    if (!c) throw new Error('Complaint not found.');
    return c;
  }

  async function addComplaint(complaint) {
    const db = load();
    const record = Object.assign({ id: uid('cmp'), created_at: new Date().toISOString() }, complaint);
    db.complaints.push(record);
    save(db);
    return record;
  }

  async function updateComplaintStatus(id, newStatus, note, actor) {
    const db = load();
    const c = db.complaints.find(x => x.id === id);
    if (!c) throw new Error('Complaint not found.');
    c.status = newStatus;
    c.status_history = Array.isArray(c.status_history) ? c.status_history : [];
    c.status_history.push({
      status: newStatus,
      note: note || '',
      actor: actor || 'admin',
      timestamp: new Date().toISOString()
    });
    save(db);
    return c;
  }

  /* ---------------- activity log ---------------- */

  async function logActivity(userId, email, action, detail) {
    const db = load();
    db.activity.push({
      id: uid('act'),
      user_id: userId,
      email: (email || '').toLowerCase(),
      action,
      detail: detail || '',
      created_at: new Date().toISOString()
    });
    save(db);
  }

  /* ---------------- stats (admin) ---------------- */

  function computeStats(all) {
    const stats = { total: all.length, resolved: 0, inProgress: 0, submitted: 0, byCategory: {} };
    all.forEach(c => {
      if (c.status === 'Resolved') stats.resolved++;
      else if (c.status === 'In Progress') stats.inProgress++;
      else stats.submitted++;
      stats.byCategory[c.category] = (stats.byCategory[c.category] || 0) + 1;
    });
    return stats;
  }

  return {
    getSession, setSession, clearSession,
    getAdminSession, setAdminSession, clearAdminSession,
    findUserByEmail, findUserByMatric, createUser, verifyPassword, setPassword,
    getMyProfile,
    getComplaintsForUser, getAllComplaints, getComplaintById, addComplaint, updateComplaintStatus,
    logActivity,
    computeStats
  };
})();
