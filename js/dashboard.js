/* ============================================================
   Campus-Voice — dashboard.js
   Runs only on dashboard.html. Guards the page (redirects to
   login.html if there is no Supabase session — nothing is fetched
   before that check resolves), renders the signed-in student's own
   complaints, and handles new-complaint submission.
   ============================================================ */

(async function () {
  const session = await CV.Auth.requireStudent();
  if (!session) return; // navigation already redirected
  const { authUser, profile } = session;

  /* ---------------- Header ---------------- */
  document.getElementById('navUserName').textContent = profile.name || authUser.email;
  document.getElementById('navUserMatric').textContent = profile.matric || '';
  document.getElementById('logoutBtn').addEventListener('click', CV.Auth.logout);

  /* ---------------- Tabs ---------------- */
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'panel-my-complaints') {
        DB.logActivity(authUser.id, authUser.email, 'complaints_viewed', 'Opened My Complaints');
        renderComplaints();
      }
    });
  });

  /* ---------------- Submit complaint ---------------- */
  const form = document.getElementById('complaintForm');
  const msg = document.getElementById('complaintMsg');
  const fileInput = document.getElementById('cAttachment');
  const fileNameLabel = document.getElementById('fileNameLabel');

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      fileNameLabel.textContent = fileInput.files[0] ? fileInput.files[0].name : 'No file selected';
    });
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    CV.hideMsg(msg);

    const category = document.getElementById('cCategory').value;
    const urgency = document.getElementById('cUrgency').value;
    const description = document.getElementById('cDescription').value.trim();

    if (!category || !urgency || !description) {
      CV.showMsg(msg, 'Please complete every field before submitting.', 'error');
      return;
    }
    if (description.length < 15) {
      CV.showMsg(msg, 'Give a little more detail (at least 15 characters) so it can be actioned.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';

    try {
      const attachment = await CV.fileToBase64(fileInput.files[0]);
      const now = new Date().toISOString();

      await DB.addComplaint({
        student_id: authUser.id,
        student_name: profile.name,
        student_matric: profile.matric,
        student_email: authUser.email,
        category, urgency, description,
        attachment_data: attachment || null,
        attachment_name: fileInput.files[0] ? fileInput.files[0].name : null,
        status: 'Submitted',
        status_history: [{ status: 'Submitted', note: 'Complaint filed by student', actor: profile.name, timestamp: now }]
      });
      await DB.logActivity(authUser.id, authUser.email, 'complaint_submitted', `${category} complaint (${urgency}) submitted`);

      form.reset();
      fileNameLabel.textContent = 'No file selected';
      CV.showMsg(msg, 'Complaint submitted. Track its status under "My Complaints."', 'success');

      document.querySelector('.tab-btn[data-tab="panel-my-complaints"]').click();
    } catch (err) {
      CV.showMsg(msg, CV.friendlyError(err), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit complaint';
    }
  });

  /* ---------------- My Complaints list ---------------- */
  const listEl = document.getElementById('complaintList');
  const emptyEl = document.getElementById('complaintEmpty');
  const loadingEl = document.getElementById('complaintLoading');
  let complaintsCache = [];

  async function renderComplaints() {
    listEl.innerHTML = '';
    emptyEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');

    let complaints = [];
    try {
      complaints = await DB.getComplaintsForUser(authUser.id);
    } catch (err) {
      loadingEl.classList.add('hidden');
      listEl.innerHTML = `<div class="empty-state"><h3>Could not load complaints</h3><p>${CV.escapeHtml(CV.friendlyError(err))}</p></div>`;
      return;
    }
    loadingEl.classList.add('hidden');
    complaintsCache = complaints;

    if (complaints.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    listEl.innerHTML = complaints.map(c => `
      <div class="complaint-card ${CV.borderClass(c.status)}" data-id="${c.id}">
        <div class="row1">
          <div>
            <div class="cat">${CV.escapeHtml(c.category)}</div>
          </div>
          <span class="badge ${CV.badgeClass(c.status)}">${CV.escapeHtml(c.status)}</span>
        </div>
        <p class="desc">${CV.escapeHtml(c.description)}</p>
        <div class="row2">
          <span class="urgency-tag urgency-${CV.escapeHtml(c.urgency)}">${CV.escapeHtml(c.urgency)} urgency</span>
          <span>Filed ${CV.formatDate(c.created_at)}</span>
          ${c.attachment_data ? '<span>📎 Attachment</span>' : ''}
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.complaint-card').forEach(card => {
      card.addEventListener('click', () => openHistoryModal(card.dataset.id));
    });
  }

  /* ---------------- History modal ---------------- */
  const overlay = document.getElementById('historyModal');
  const modalBody = document.getElementById('historyModalBody');

  function openHistoryModal(id) {
    const c = complaintsCache.find(x => x.id === id);
    if (!c) return;
    DB.logActivity(authUser.id, authUser.email, 'complaint_viewed', `Viewed complaint ${id}`);

    modalBody.innerHTML = `
      <div class="modal-head">
        <div>
          <h3 class="mt-0">${CV.escapeHtml(c.category)} complaint</h3>
          <span class="badge ${CV.badgeClass(c.status)}">${CV.escapeHtml(c.status)}</span>
        </div>
        <button class="modal-close" id="closeHistoryModal" aria-label="Close">&times;</button>
      </div>
      <p class="small">Filed ${CV.formatDate(c.created_at)} · <span class="urgency-tag urgency-${CV.escapeHtml(c.urgency)}">${CV.escapeHtml(c.urgency)} urgency</span></p>
      <p>${CV.escapeHtml(c.description)}</p>
      ${c.attachment_data ? `<div class="attachment-preview">${
          c.attachment_data.startsWith('data:image')
            ? `<img src="${c.attachment_data}" alt="Attachment: ${CV.escapeHtml(c.attachment_name)}">`
            : `<a href="${c.attachment_data}" download="${CV.escapeHtml(c.attachment_name)}">Download attachment — ${CV.escapeHtml(c.attachment_name)}</a>`
        }</div>` : ''}
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
    document.getElementById('closeHistoryModal').addEventListener('click', closeHistoryModal);
  }

  function closeHistoryModal() {
    overlay.classList.remove('show');
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHistoryModal(); });

  // Initial render — a brand-new account resolves to an empty list here,
  // which is the correct empty state, not a stalled loading spinner.
  renderComplaints();
})();
