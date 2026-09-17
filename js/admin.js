/* ============================================================
   Campus-Voice — admin.js
   Runs only on admin.html. There's no per-account admin system here
   — just one fixed username/password checked in this file. Change
   ADMIN_EMAIL / ADMIN_PASSWORD below to whatever you want the admin
   login to be.

   NOTE: because this is a static, backend-less site, this password
   lives in plain JavaScript that anyone can view in the browser. It
   keeps casual visitors out of the admin table, but it is NOT real
   security — don't rely on this for protecting sensitive data.
   ============================================================ */

(function () {
  const ADMIN_EMAIL = 'admin@campus-voice.local';
  const ADMIN_PASSWORD = 'admin123';

  const loginSection = document.getElementById('adminLoginSection');
  const dashSection = document.getElementById('adminDashSection');
  const loginForm = document.getElementById('adminLoginForm');
  const loginMsg = document.getElementById('adminLoginMsg');
  const logoutBtn = document.getElementById('adminLogoutBtn');

  const adminUser = { id: 'admin', email: ADMIN_EMAIL };

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

  function checkExistingSession() {
    if (DB.getAdminSession()) showDashboard();
    else showLogin();
  }
  checkExistingSession();

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    CV.hideMsg(loginMsg);
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPass').value;

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';

    const ok = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD;

    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';

    if (!ok) {
      CV.showMsg(loginMsg, 'This account does not have admin access.', 'error');
      return;
    }

    DB.setAdminSession();
    await DB.logActivity(adminUser.id, adminUser.email, 'admin_login', 'Admin logged in');
    loginForm.reset();
    showDashboard();
  });

  logoutBtn.addEventListener('click', async function () {
    await DB.logActivity(adminUser.id, adminUser.email, 'admin_logout', 'Admin logged out');
    DB.clearAdminSession();
    showLogin();
  });

  /* ---------------- Stats ---------------- */
  function renderStats(all) {
    const s = DB.computeStats(all);
    const catEntries = Object.entries(s.byCategory);
    const topCat = catEntries.length ? catEntries.sort((a, b) => b[1] - a[1])[0] : null;

    document.getElementById('statsGrid').innerHTML = `
      <div class="stat-card accent">
        <span class="num">${s.total}</span>
        <span class="label">Total complaints</span>
      </div>
      <div class="stat-card">
        <span class="num">${s.submitted}</span>
        <span class="label">Awaiting review</span>
      </div>
      <div class="stat-card blue">
        <span class="num">${s.inProgress}</span>
        <span class="label">In progress</span>
      </div>
      <div class="stat-card green">
        <span class="num">${s.resolved}</span>
        <span class="label">Resolved</span>
      </div>
      <div class="stat-card">
        <span class="num">${topCat ? topCat[1] : 0}</span>
        <span class="label">${topCat ? 'Most reported: ' + CV.escapeHtml(topCat[0]) : 'No complaints yet'}</span>
      </div>
    `;
  }

  /* ---------------- Filters + table ---------------- */
  const filterCategory = document.getElementById('filterCategory');
  const filterStatus = document.getElementById('filterStatus');
  const filterUrgency = document.getElementById('filterUrgency');
  const tableBody = document.getElementById('complaintsTableBody');
  const tableEmpty = document.getElementById('tableEmpty');
  const tableLoading = document.getElementById('tableLoading');

  let allComplaints = [];

  [filterCategory, filterStatus, filterUrgency].forEach(sel => {
    sel.addEventListener('change', () => renderTable(allComplaints));
  });

  function renderTable(all) {
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
        <td>
          <strong>${CV.escapeHtml(c.student_name)}</strong><br>
          <span class="small">${CV.escapeHtml(c.student_matric)}</span>
        </td>
        <td>${CV.escapeHtml(c.category)}</td>
        <td class="desc-cell">${CV.escapeHtml(c.description)}</td>
        <td><span class="urgency-tag urgency-${CV.escapeHtml(c.urgency)}">${CV.escapeHtml(c.urgency)}</span></td>
        <td><span class="badge ${CV.badgeClass(c.status)}">${CV.escapeHtml(c.status)}</span></td>
        <td class="small">${CV.formatDate(c.created_at)}</td>
        <td><button class="btn btn-outline btn-sm" data-id="${c.id}">Manage</button></td>
      </tr>
    `).join('');

    tableBody.querySelectorAll('button[data-id]').forEach(btn => {
      btn.addEventListener('click', () => openManageModal(btn.dataset.id));
    });
  }

  async function renderAll() {
    tableLoading.classList.remove('hidden');
    tableBody.innerHTML = '';
    tableEmpty.classList.add('hidden');
    try {
      allComplaints = await DB.getAllComplaints();
    } catch (err) {
      tableLoading.classList.add('hidden');
      tableBody.innerHTML = `<tr><td colspan="7">${CV.escapeHtml(CV.friendlyError(err))}</td></tr>`;
      return;
    }
    tableLoading.classList.add('hidden');
    renderStats(allComplaints);
    renderTable(allComplaints);
  }

  /* ---------------- Manage modal ---------------- */
  const overlay = document.getElementById('manageModal');
  const modalBody = document.getElementById('manageModalBody');

  function openManageModal(id) {
    const c = allComplaints.find(x => x.id === id);
    if (!c) return;

    modalBody.innerHTML = `
      <div class="modal-head">
        <div>
          <h3 class="mt-0">${CV.escapeHtml(c.category)} — ${CV.escapeHtml(c.student_name)}</h3>
          <span class="small">${CV.escapeHtml(c.student_matric)} · ${CV.escapeHtml(c.student_email)}</span>
        </div>
        <button class="modal-close" id="closeManageModal" aria-label="Close">&times;</button>
      </div>
      <p class="small"><span class="urgency-tag urgency-${CV.escapeHtml(c.urgency)}">${CV.escapeHtml(c.urgency)} urgency</span> · Filed ${CV.formatDate(c.created_at)}</p>
      <p>${CV.escapeHtml(c.description)}</p>
      ${c.attachment_data ? `<div class="attachment-preview">${
          c.attachment_data.startsWith('data:image')
            ? `<img src="${c.attachment_data}" alt="Attachment">`
            : `<a href="${c.attachment_data}" download="${CV.escapeHtml(c.attachment_name)}">Download attachment — ${CV.escapeHtml(c.attachment_name)}</a>`
        }</div>` : ''}
      <hr class="divider">
      <form id="statusForm">
        <div class="field">
          <label for="statusSelect">Update status</label>
          <select id="statusSelect">
            <option value="Submitted" ${c.status === 'Submitted' ? 'selected' : ''}>Submitted</option>
            <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </div>
        <div class="field">
          <label for="resolutionNote">Resolution note (optional)</label>
          <textarea id="resolutionNote" rows="3" placeholder="What was done, or what happens next…"></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Save update</button>
      </form>
      <hr class="divider">
      <h3>Status history</h3>
      <ul class="history-list">
        ${(c.status_history || []).map(h => `
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
    document.getElementById('statusForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      const saveBtn = e.target.querySelector('button[type="submit"]');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      const newStatus = document.getElementById('statusSelect').value;
      const note = document.getElementById('resolutionNote').value.trim();
      try {
        await DB.updateComplaintStatus(c.id, newStatus, note, adminUser.email || 'Admin');
        closeManageModal();
        renderAll();
      } catch (err) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save update';
        alert(CV.friendlyError(err));
      }
    });
  }

  function closeManageModal() {
    overlay.classList.remove('show');
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeManageModal(); });
})();
