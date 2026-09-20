/* ============================================================
   Campus-Voice — admin.js
   Runs only on admin.html. Admin login is a fixed local account
   (default: admin / admin123, changeable via the Change Password
   panel) checked against localStorage — no external service
   involved, so it works instantly and never depends on email.
   ============================================================ */

(function () {
  DB.ensureDefaultAdmin();

  const loginSection = document.getElementById('adminLoginSection');
  const dashSection = document.getElementById('adminDashSection');
  const loginForm = document.getElementById('adminLoginForm');
  const loginMsg = document.getElementById('adminLoginMsg');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  function showDashboard() {
    loginSection.classList.add('hidden');
    dashSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    renderAll();
  }
  function showLogin() {
    dashSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
  }

  if (DB.isAdminLoggedIn()) showDashboard(); else showLogin();

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    CV.hideMsg(loginMsg);
    const u = document.getElementById('adminUser').value.trim();
    const p = document.getElementById('adminPass').value;
    const creds = DB.getAdminCreds();

    if (u === creds.username && CV.obfuscate(p) === creds.passwordHash) {
      DB.setAdminSession(true);
      DB.logActivity('admin', 'admin_login', 'Admin logged in');
      loginForm.reset();
      showDashboard();
    } else {
      CV.showMsg(loginMsg, 'Incorrect admin username or password.', 'error');
    }
  });

  logoutBtn.addEventListener('click', function () {
    DB.logActivity('admin', 'admin_logout', 'Admin logged out');
    DB.setAdminSession(false);
    showLogin();
  });

  /* ---------------- Change admin password ---------------- */
  const changeForm = document.getElementById('changePassForm');
  const changeMsg = document.getElementById('changePassMsg');
  if (changeForm) {
    changeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      CV.hideMsg(changeMsg);
      const current = document.getElementById('cpCurrent').value;
      const next = document.getElementById('cpNew').value;
      const creds = DB.getAdminCreds();
      if (CV.obfuscate(current) !== creds.passwordHash) {
        CV.showMsg(changeMsg, 'Current password is incorrect.', 'error');
        return;
      }
      if (next.length < 6) {
        CV.showMsg(changeMsg, 'New password must be at least 6 characters.', 'error');
        return;
      }
      localStorage.setItem('cv_admin_creds', JSON.stringify({ username: creds.username, passwordHash: CV.obfuscate(next) }));
      CV.showMsg(changeMsg, 'Password updated.', 'success');
      changeForm.reset();
    });
  }

  /* ---------------- Stats ---------------- */
  function renderStats() {
    const s = DB.computeStats();
    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card accent"><span class="num">${s.total}</span><span class="label">Total complaints</span></div>
      <div class="stat-card"><span class="num">${s.submitted}</span><span class="label">Awaiting review</span></div>
      <div class="stat-card teal"><span class="num">${s.approved}</span><span class="label">Approved</span></div>
      <div class="stat-card blue"><span class="num">${s.inProgress}</span><span class="label">In progress</span></div>
      <div class="stat-card green"><span class="num">${s.resolved}</span><span class="label">Resolved</span></div>
      <div class="stat-card red"><span class="num">${s.rejected}</span><span class="label">Rejected</span></div>
    `;
  }

  /* ---------------- Filters + table ---------------- */
  const filterCategory = document.getElementById('filterCategory');
  const filterStatus = document.getElementById('filterStatus');
  const filterUrgency = document.getElementById('filterUrgency');
  const tableBody = document.getElementById('complaintsTableBody');
  const tableEmpty = document.getElementById('tableEmpty');

  [filterCategory, filterStatus, filterUrgency].forEach(sel => sel.addEventListener('change', renderTable));

  function renderTable() {
    const all = DB.getAllComplaints().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const filtered = all.filter(c =>
      (filterCategory.value === 'all' || c.category === filterCategory.value) &&
      (filterStatus.value === 'all' || c.status === filterStatus.value) &&
      (filterUrgency.value === 'all' || c.urgency === filterUrgency.value)
    );

    if (filtered.length === 0) {
      tableBody.innerHTML = '';
      tableEmpty.classList.remove('hidden');
      return;
    }
    tableEmpty.classList.add('hidden');

    tableBody.innerHTML = filtered.map(c => `
      <tr>
        <td><strong>${CV.escapeHtml(c.studentName)}</strong><br><span class="small">${CV.escapeHtml(c.studentMatric)}</span></td>
        <td>${CV.escapeHtml(c.category)}</td>
        <td class="desc-cell">${CV.escapeHtml(c.description)}</td>
        <td><span class="urgency-tag urgency-${CV.escapeHtml(c.urgency)}">${CV.escapeHtml(c.urgency)}</span></td>
        <td><span class="badge ${CV.badgeClass(c.status)}">${CV.escapeHtml(c.status)}</span></td>
        <td class="small">${CV.formatDate(c.createdAt)}</td>
        <td><button class="btn btn-outline btn-sm" data-id="${c.id}">Manage</button></td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => openManageModal(btn.dataset.id));
    });
  }

  function renderAll() { renderStats(); renderTable(); }

  /* ---------------- Manage modal ---------------- */
  const overlay = document.getElementById('manageModal');
  const modalBody = document.getElementById('manageModalBody');

  function openManageModal(id) {
    const c = DB.getComplaintById(id);
    if (!c) return;

    modalBody.innerHTML = `
      <div class="modal-head">
        <div>
          <h3 class="mt-0">${CV.escapeHtml(c.category)} — ${CV.escapeHtml(c.studentName)}</h3>
          <span class="small">${CV.escapeHtml(c.studentMatric)} · ${CV.escapeHtml(c.studentEmail)}</span>
        </div>
        <button class="modal-close" id="closeManageModal" aria-label="Close">&times;</button>
      </div>
      <p class="small">
        <span class="badge ${CV.badgeClass(c.status)}">${CV.escapeHtml(c.status)}</span>
        &nbsp;<span class="urgency-tag urgency-${CV.escapeHtml(c.urgency)}">${CV.escapeHtml(c.urgency)} urgency</span>
        · Filed ${CV.formatDate(c.createdAt)}
      </p>
      <p>${CV.escapeHtml(c.description)}</p>
      ${c.attachment ? `<div class="attachment-preview">${
          c.attachment.startsWith('data:image')
            ? `<img src="${c.attachment}" alt="Attachment">`
            : `<a href="${c.attachment}" download="${CV.escapeHtml(c.attachmentName)}">Download attachment — ${CV.escapeHtml(c.attachmentName)}</a>`
        }</div>` : ''}
      <hr class="divider">
      <div class="field">
        <label for="resolutionNote">Note (optional — shown to the student)</label>
        <textarea id="resolutionNote" rows="3" placeholder="What was done, or why…"></textarea>
      </div>
      <div class="action-row">
        <button class="btn btn-outline" data-status="Approved">Approve</button>
        <button class="btn btn-outline" data-status="In Progress">Process</button>
        <button class="btn btn-primary" data-status="Resolved">Resolve</button>
        <button class="btn btn-danger" data-status="Rejected">Reject</button>
      </div>
      <hr class="divider">
      <h3>Status history</h3>
      <ul class="history-list">
        ${c.statusHistory.map(h => `
          <li>
            <div class="h-status">${CV.escapeHtml(h.status)}</div>
            <div class="h-time">${CV.formatDate(h.timestamp)}${h.actor ? ' · ' + CV.escapeHtml(h.actor) : ''}</div>
            ${h.note ? `<div class="h-note">${CV.escapeHtml(h.note)}</div>` : ''}
          </li>
        `).join('')}
      </ul>
    `;
    overlay.classList.add('show');
    document.getElementById('closeManageModal').addEventListener('click', closeManageModal);
    modalBody.querySelectorAll('.action-row button[data-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        const note = document.getElementById('resolutionNote').value.trim();
        DB.updateComplaintStatus(c.id, btn.dataset.status, note, 'Admin');
        DB.logActivity('admin', 'complaint_' + btn.dataset.status.toLowerCase().replace(' ', '_'), `Complaint ${c.id} marked ${btn.dataset.status}`);
        closeManageModal();
        renderAll();
      });
    });
  }

  function closeManageModal() { overlay.classList.remove('show'); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeManageModal(); });
})();
