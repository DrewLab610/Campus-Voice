/* ============================================================
   Campus-Voice — dashboard.js
   Runs only on dashboard.html. Guards the page (redirects to
   login.html if no session), renders the signed-in student's own
   complaints, and handles new-complaint submission. Everything here
   is synchronous localStorage access — no loading states needed.
   ============================================================ */

(function () {
  const user = CV.Auth.requireStudent();
  if (!user) return;

  /* ---------------- Header ---------------- */
  document.getElementById('navUserName').textContent = user.name;
  document.getElementById('navUserMatric').textContent = user.matric;
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
        DB.logActivity(user.email, 'complaints_viewed', 'Opened My Complaints');
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
      const complaint = {
        id: CV.makeId('cmp'),
        studentEmail: user.email,
        studentName: user.name,
        studentMatric: user.matric,
        category, urgency, description,
        attachment: attachment || '',
        attachmentName: fileInput.files[0] ? fileInput.files[0].name : '',
        status: 'Submitted',
        statusHistory: [{ status: 'Submitted', note: 'Complaint filed by student', actor: user.name, timestamp: now }],
        createdAt: now
      };
      DB.addComplaint(complaint);
      DB.logActivity(user.email, 'complaint_submitted', `${category} complaint (${urgency}) submitted`);

      form.reset();
      fileNameLabel.textContent = 'No file selected';
      CV.showMsg(msg, 'Complaint submitted. Track its status under "My Complaints."', 'success');

      document.querySelector('.tab-btn[data-tab="panel-my-complaints"]').click();
    } catch (err) {
      CV.showMsg(msg, err.message || 'Could not submit the complaint. Try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit complaint';
    }
  });

  /* ---------------- My Complaints list ---------------- */
  const listEl = document.getElementById('complaintList');
  const emptyEl = document.getElementById('complaintEmpty');

  function renderComplaints() {
    const complaints = DB.getComplaintsForUser(user.email);

    if (complaints.length === 0) {
      listEl.innerHTML = '';
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');

    listEl.innerHTML = complaints.map(c => `
      <div class="complaint-card ${CV.borderClass(c.status)}" data-id="${c.id}">
        <div class="row1">
          <div><div class="cat">${CV.escapeHtml(c.category)}</div></div>
          <span class="badge ${CV.badgeClass(c.status)}">${CV.escapeHtml(c.status)}</span>
        </div>
        <p class="desc">${CV.escapeHtml(c.description)}</p>
        <div class="row2">
          <span class="urgency-tag urgency-${CV.escapeHtml(c.urgency)}">${CV.escapeHtml(c.urgency)} urgency</span>
          <span>Filed ${CV.formatDate(c.createdAt)}</span>
          ${c.attachment ? '<span>📎 Attachment</span>' : ''}
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
    const c = DB.getComplaintById(id);
    if (!c) return;
    DB.logActivity(user.email, 'complaint_viewed', `Viewed complaint ${id}`);

    modalBody.innerHTML = `
      <div class="modal-head">
        <div>
          <h3 class="mt-0">${CV.escapeHtml(c.category)} complaint</h3>
          <span class="badge ${CV.badgeClass(c.status)}">${CV.escapeHtml(c.status)}</span>
        </div>
        <button class="modal-close" id="closeHistoryModal" aria-label="Close">&times;</button>
      </div>
      <p class="small">Filed ${CV.formatDate(c.createdAt)} · <span class="urgency-tag urgency-${CV.escapeHtml(c.urgency)}">${CV.escapeHtml(c.urgency)} urgency</span></p>
      <p>${CV.escapeHtml(c.description)}</p>
      ${c.attachment ? `<div class="attachment-preview">${
          c.attachment.startsWith('data:image')
            ? `<img src="${c.attachment}" alt="Attachment: ${CV.escapeHtml(c.attachmentName)}">`
            : `<a href="${c.attachment}" download="${CV.escapeHtml(c.attachmentName)}">Download attachment — ${CV.escapeHtml(c.attachmentName)}</a>`
        }</div>` : ''}
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
    document.getElementById('closeHistoryModal').addEventListener('click', closeHistoryModal);
  }

  function closeHistoryModal() { overlay.classList.remove('show'); }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeHistoryModal(); });

  renderComplaints();
})();
