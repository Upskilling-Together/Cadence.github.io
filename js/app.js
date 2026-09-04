(function () {
  const role = document.body.dataset.role; // 'home' | 'tutors' | 'dashboard'
  // Home and Tutors are both parent-facing pages — group them the same way
  // for analytics so existing PostHog breakdowns (parent vs. dashboard)
  // keep working without changes.
  const analyticsRole = role === 'dashboard' ? 'dashboard' : 'parent';
  track('$pageview', { path: location.pathname }, analyticsRole);

  const SUBJECT_LABEL = { math: 'Math', science: 'Science', reading: 'Reading' };

  // Hourly rates and availability below are placeholders for the prototype
  // — Dana hasn't set real pricing or confirmed current availability yet.
  // Swap these for her actual rates/schedule before launch. Tutors also
  // don't have real photos yet, so each card uses a colored initial as a
  // stand-in "photo" until Dana sends real ones.
  const TUTORS = [
    { id: 't1', name: 'Maria Chen', subject: 'math', grade: 'Grades 3–8', rate: 35, color: '#3B6FD1',
      availability: 'Weekday afternoons',
      bio: 'Builds number confidence first, speed second — great for kids who freeze up on math homework.' },
    { id: 't2', name: 'Jordan Alvarez', subject: 'math', grade: 'Grades 6–12', rate: 40, color: '#3B6FD1',
      availability: 'Tue/Thu evenings, Sat mornings',
      bio: 'Pre-algebra through Algebra II, with a steady hand for test anxiety and missed fundamentals.' },
    { id: 't3', name: 'Priya Nair', subject: 'math', grade: 'Grades K–5', rate: 32, color: '#3B6FD1',
      availability: 'Mon/Wed/Fri afternoons',
      bio: 'Foundational math through play and patterns — a favorite with younger, wigglier students.' },
    { id: 't4', name: 'Sam Whitfield', subject: 'math', grade: 'Grades 6–9', rate: 35, color: '#3B6FD1',
      availability: 'Weekday evenings',
      bio: 'Middle school math and pre-algebra, focused on closing gaps before they snowball.' },
    { id: 't5', name: 'Elena Brooks', subject: 'science', grade: 'Grades 6–12', rate: 42, color: '#7A5CC4',
      availability: 'Weekend mornings',
      bio: 'Life and physical science tutoring, from lab reports to test prep.' },
    { id: 't6', name: 'Tasha Green', subject: 'reading', grade: 'Grades K–5', rate: 30, color: '#DB6A3B',
      availability: 'Weekday mornings',
      bio: 'Elementary reading and phonics, with an ear for exactly where a young reader gets stuck.' },
  ];

  // ---------------- localStorage-backed booking store ----------------
  // GitHub Pages serves static files only — there's no server to hold shared
  // state, so bookings live in this browser's localStorage. That means Dana
  // reviewing on her own laptop won't see bookings a parent submitted on
  // theirs; a real launch would need a small backend (or a service like
  // Supabase/Firebase) for that. Fine for a prototype demo, seeded below so
  // the dashboard has something to show the first time it's opened.
  const STORE_KEY = 'abc_tutoring_bookings_v1';

  function seedBookings() {
    const now = Date.now();
    return [
      { id: 'seed-1', parentName: 'Alex Rivera', email: 'alex.rivera@example.com', studentName: 'Sam', gradeLevel: '5th grade', subject: 'math', tutorId: 't1', tutorName: 'Maria Chen', status: 'confirmed', createdAt: new Date(now - 3 * 3600e3).toISOString() },
      { id: 'seed-2', parentName: 'Priya Nair', email: 'priya.nair@example.com', studentName: 'Noah', gradeLevel: '7th grade', subject: 'math', tutorId: 't4', tutorName: 'Sam Whitfield', status: 'confirmed', createdAt: new Date(now - 26 * 3600e3).toISOString() },
      { id: 'seed-3', parentName: 'Marcus Brown', email: 'marcus.b@example.com', studentName: 'Ivy', gradeLevel: '2nd grade', subject: 'reading', tutorId: null, tutorName: null, status: 'pending', createdAt: new Date(now - 40 * 60e3).toISOString() },
      { id: 'seed-4', parentName: 'Hannah Kim', email: 'hannah.kim@example.com', studentName: 'Owen', gradeLevel: '9th grade', subject: 'science', tutorId: 't5', tutorName: 'Elena Brooks', status: 'pending', createdAt: new Date(now - 12 * 60e3).toISOString() },
    ];
  }

  function loadBookings() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to reseed */ }
    const seeded = seedBookings();
    saveBookings(seeded);
    return seeded;
  }
  function saveBookings(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) { /* storage full/unavailable — degrade silently */ }
  }

  function initials(name) { return name.split(' ').map((p) => p[0]).join(''); }
  function timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.round(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + 'm ago';
    const hr = Math.round(min / 60);
    if (hr < 24) return hr + 'h ago';
    return Math.round(hr / 24) + 'd ago';
  }

  // ================= PARENT-FACING PAGES (Home + Tutors) =================
  // Both pages share the same booking modal so "request a session" works
  // the same way whether a parent starts from the home page or from a
  // specific tutor's card. Only the Tutors page renders the tutor grid.
  if (role === 'home' || role === 'tutors') {
    let activeFilter = 'all';
    let bookingContext = null;

    function renderFilters() {
      const row = document.getElementById('filter-row');
      const subjects = ['all', 'math', 'science', 'reading'];
      row.innerHTML = subjects.map((s) => {
        const label = s === 'all' ? 'All subjects' : SUBJECT_LABEL[s];
        return `<button class="filter-chip ${s === activeFilter ? 'active' : ''}" data-subject="${s}">${label}</button>`;
      }).join('');
      row.querySelectorAll('.filter-chip').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeFilter = btn.dataset.subject;
          track('tutor_filter_used', { subject: activeFilter }, analyticsRole);
          renderFilters();
          renderTutors();
        });
      });
    }

    function renderTutors() {
      const grid = document.getElementById('tutor-grid');
      const list = TUTORS.filter((t) => activeFilter === 'all' || t.subject === activeFilter);
      grid.innerHTML = list.map((t) => `
        <div class="tutor-card">
          <div class="tutor-top">
            <div class="avatar avatar-photo" style="background:${t.color}">${initials(t.name)}</div>
            <div>
              <div class="tutor-name">${t.name}</div>
              <div class="tutor-grade">${t.grade} · $${t.rate}/hr</div>
            </div>
          </div>
          <span class="pill ${t.subject}" style="align-self:flex-start;"><span class="dot"></span>${SUBJECT_LABEL[t.subject]}</span>
          <div class="tutor-availability"><b>Available:</b> ${t.availability}</div>
          <div class="tutor-bio">${t.bio}</div>
          <div class="tutor-foot">
            <button class="btn btn-primary btn-sm" data-tutor="${t.id}">Request ${t.name.split(' ')[0]}</button>
          </div>
        </div>
      `).join('');
      grid.querySelectorAll('[data-tutor]').forEach((btn) => btn.addEventListener('click', () => openBooking(btn.dataset.tutor)));
    }

    window.openBooking = function (tutorId) {
      bookingContext = tutorId ? TUTORS.find((t) => t.id === tutorId) : null;
      track('booking_modal_opened', { tutor_id: bookingContext ? bookingContext.id : null, subject: bookingContext ? bookingContext.subject : null }, analyticsRole);
      renderBookingForm();
      document.getElementById('overlay').hidden = false;
    };
    window.closeBooking = function () { document.getElementById('overlay').hidden = true; };
    document.getElementById('overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') closeBooking(); });

    function renderBookingForm() {
      const el = document.getElementById('modal-content');
      el.innerHTML = `
        <div class="modal-head">
          <div>
            <h3 style="font-family:'Fredoka',sans-serif;font-size:1.3rem;">Request a session</h3>
            <p class="sub">${bookingContext ? 'Requesting ' + bookingContext.name + '. Dana will follow up to confirm.' : "Just a few details — Dana will follow up to match you with a tutor."}</p>
          </div>
          <button class="modal-close" onclick="closeBooking()" aria-label="Close">&times;</button>
        </div>
        <form id="booking-form">
          <div class="field-row">
            <div class="field"><label>Parent name</label><input required name="parentName" placeholder="Alex Rivera"></div>
            <div class="field"><label>Email</label><input required type="email" name="email" placeholder="alex@email.com"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Student's first name</label><input required name="studentName" placeholder="Sam"></div>
            <div class="field"><label>Grade</label><input required name="gradeLevel" placeholder="6th grade"></div>
          </div>
          <div class="field"><label>Subject</label>
            <select name="subject" id="subject-select">
              <option value="math" ${bookingContext && bookingContext.subject === 'math' ? 'selected' : ''}>Math</option>
              <option value="science" ${bookingContext && bookingContext.subject === 'science' ? 'selected' : ''}>Science</option>
              <option value="reading" ${bookingContext && bookingContext.subject === 'reading' ? 'selected' : ''}>Reading</option>
            </select>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" onclick="closeBooking()">Cancel</button>
            <button type="submit" class="btn btn-primary">Send request</button>
          </div>
        </form>
      `;
      document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);
    }

    function handleBookingSubmit(e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const booking = {
        id: 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        parentName: fd.get('parentName'), email: fd.get('email'),
        studentName: fd.get('studentName'), gradeLevel: fd.get('gradeLevel'),
        subject: fd.get('subject'),
        // Not a form field — just carried over automatically when the parent
        // clicked a specific tutor's "Request" button, so Dana has that
        // context without asking the parent to pick one.
        tutorId: bookingContext ? bookingContext.id : null,
        tutorName: bookingContext ? bookingContext.name : null,
        status: 'pending', createdAt: new Date().toISOString(),
      };
      const bookings = loadBookings();
      bookings.unshift(booking);
      saveBookings(bookings);

      track('booking_submitted', {
        subject: booking.subject, grade_level: booking.gradeLevel,
      }, analyticsRole);
      renderConfirmation(booking);
    }

    function renderConfirmation(record) {
      const el = document.getElementById('modal-content');
      el.innerHTML = `
        <div class="confirm-box">
          <div class="check">✓</div>
          <h3>Request sent!</h3>
          <p>Dana checks tutor availability before confirming — she'll follow up with ${record.parentName.split(' ')[0]} within a day or two.</p>
          <div class="confirm-summary">
            <div><span>Student</span><b>${record.studentName}, ${record.gradeLevel}</b></div>
            <div><span>Subject</span><b>${SUBJECT_LABEL[record.subject]}</b></div>
            ${record.tutorName ? `<div><span>Tutor</span><b>${record.tutorName}</b></div>` : ''}
          </div>
          <p style="font-size:0.78rem;color:var(--ink-faint);margin-top:-6px;">Saved on this device — open Dana's dashboard in this same browser to see it waiting for approval.</p>
          <button class="btn btn-primary" onclick="closeBooking()" style="width:100%;justify-content:center;">Done</button>
        </div>
      `;
    }

    if (role === 'tutors') {
      renderFilters();
      renderTutors();
    }
  }

  // ================= DANA'S DASHBOARD =================
  if (role === 'dashboard') {
    track('dashboard_viewed', {}, 'dashboard');

    // Alerts for new requests while this dashboard tab is open. Since this
    // is a static, backend-less prototype, there is no way to reach Dana
    // by email/text or while the tab is closed — this only works for
    // requests that arrive while she's looking at this page in this
    // browser. A real launch would need a small backend to send an actual
    // email/SMS alert regardless of whether the dashboard is open.
    let knownPendingIds = null; // null until first render, so seed/existing pending items never "alert"
    let newlyArrivedIds = new Set();
    const ORIGINAL_TITLE = document.title;
    let titleFlashTimer = null;

    function flashTitle() {
      if (titleFlashTimer) return;
      let on = false;
      let ticks = 0;
      titleFlashTimer = setInterval(() => {
        document.title = on ? ORIGINAL_TITLE : '🔔 New request! · ' + ORIGINAL_TITLE;
        on = !on;
        ticks++;
        if (ticks > 8) { clearInterval(titleFlashTimer); titleFlashTimer = null; document.title = ORIGINAL_TITLE; }
      }, 900);
    }

    function notifyNewRequest(booking) {
      flashTitle();
      if (window.Notification && Notification.permission === 'granted') {
        try {
          new Notification('New tutoring request', {
            body: `${booking.studentName} (${SUBJECT_LABEL[booking.subject]}, ${booking.gradeLevel}) — from ${booking.parentName}`,
          });
        } catch (e) { /* some browsers restrict Notification outside a user gesture — the title flash + highlight still show */ }
      }
    }

    window.enableRequestAlerts = function () {
      if (!window.Notification) return;
      Notification.requestPermission().then(renderDashboard);
    };

    function checkForNewRequests() {
      const bookings = loadBookings();
      const pendingIds = new Set(bookings.filter((b) => b.status === 'pending').map((b) => b.id));
      if (knownPendingIds === null) { knownPendingIds = pendingIds; return; } // first load: don't alert on existing seed data
      const freshlyAdded = [...pendingIds].filter((id) => !knownPendingIds.has(id));
      if (freshlyAdded.length) {
        newlyArrivedIds = new Set([...newlyArrivedIds, ...freshlyAdded]);
        freshlyAdded.forEach((id) => notifyNewRequest(bookings.find((b) => b.id === id)));
        knownPendingIds = pendingIds;
        renderDashboard();
        // Drop the "Just in" highlight after a minute so it doesn't stick forever.
        setTimeout(() => { freshlyAdded.forEach((id) => newlyArrivedIds.delete(id)); renderDashboard(); }, 60000);
      } else {
        knownPendingIds = pendingIds;
      }
    }

    function renderAlertStatus() {
      const el = document.getElementById('alert-status');
      if (!el) return;
      if (!window.Notification) {
        el.innerHTML = `<span style="font-size:0.78rem;color:var(--ink-faint);">This browser can't show desktop alerts — a new request still flashes the tab and highlights on this page while it's open.</span>`;
      } else if (Notification.permission === 'granted') {
        el.innerHTML = `<span style="font-size:0.82rem;color:var(--brand-ink);">🔔 Alerts on — you'll get a notification while this tab is open.</span>`;
      } else if (Notification.permission === 'denied') {
        el.innerHTML = `<span style="font-size:0.78rem;color:var(--ink-faint);">Browser notifications are blocked — a new request still flashes the tab and highlights on this page.</span>`;
      } else {
        el.innerHTML = `<button class="btn btn-ghost btn-sm" onclick="enableRequestAlerts()">🔔 Enable request alerts</button>`;
      }
    }

    function renderDashboard() {
      renderAlertStatus();
      const bookings = loadBookings();
      const pending = bookings.filter((b) => b.status === 'pending');
      const confirmed = bookings.filter((b) => b.status === 'confirmed');
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const thisWeek = confirmed.filter((b) => b.createdAt && (Date.now() - new Date(b.createdAt).getTime()) < weekMs);

      document.getElementById('stat-tiles').innerHTML = `
        <div class="tile warn"><b>${pending.length}</b><span>Pending requests</span></div>
        <div class="tile"><b>${confirmed.length}</b><span>Confirmed sessions</span></div>
        <div class="tile"><b>${thisWeek.length}</b><span>Booked this week</span></div>
        <div class="tile"><b>${TUTORS.length}</b><span>Tutors on staff</span></div>
      `;

      const list = document.getElementById('pending-list');
      if (pending.length === 0) {
        list.innerHTML = `<div class="empty-note">No pending requests right now — new bookings from the site will show up here.</div>`;
      } else {
        list.innerHTML = pending.map((b) => {
          const matchingTutors = TUTORS.filter((t) => t.subject === b.subject);
          const options = matchingTutors.map((t) => `<option value="${t.id}" ${b.tutorId === t.id ? 'selected' : ''}>${t.name}</option>`).join('');
          const isNew = newlyArrivedIds.has(b.id);
          return `
            <div class="req-card" ${isNew ? 'style="border-color:var(--brand);box-shadow:0 0 0 2px var(--brand-tint);"' : ''}>
              <div class="req-top">
                <div>
                  <div class="req-who">
                    ${b.studentName} <span style="font-weight:400;color:var(--ink-faint);">— ${b.gradeLevel}</span>
                    <span class="pill ${b.subject}" style="margin-left:6px;"><span class="dot"></span>${SUBJECT_LABEL[b.subject]}</span>
                    ${isNew ? '<span class="status-tag confirmed" style="margin-left:6px;"><span class="live-dot" style="margin-right:4px;"></span>Just in</span>' : ''}
                  </div>
                  <div class="req-meta">requested by ${b.parentName} (${b.email})${b.tutorName ? ` · asked for ${b.tutorName}` : ''}</div>
                </div>
                <div style="text-align:right;">
                  <span class="status-tag pending">Pending</span>
                  <div class="req-time">${timeAgo(b.createdAt)}</div>
                </div>
              </div>
              <div class="req-actions">
                <select class="assign-select" id="assign-${b.id}">
                  <option value="">Assign tutor…</option>
                  ${options}
                </select>
                <button class="btn btn-sm btn-approve" data-approve="${b.id}">Approve</button>
                <button class="btn btn-sm btn-decline" data-decline="${b.id}">Decline</button>
              </div>
            </div>
          `;
        }).join('');
        list.querySelectorAll('[data-approve]').forEach((btn) => btn.addEventListener('click', () => approveBooking(btn.dataset.approve)));
        list.querySelectorAll('[data-decline]').forEach((btn) => btn.addEventListener('click', () => declineBooking(btn.dataset.decline)));
      }

      document.getElementById('tutor-schedules').innerHTML = TUTORS.map((t) => {
        const sessions = confirmed.filter((b) => b.tutorId === t.id);
        return `
          <div class="tutor-sched">
            <div class="tutor-sched-head">
              <div class="avatar" style="background:${t.color}">${initials(t.name)}</div>
              <b>${t.name}</b>
              <span class="count">${sessions.length} upcoming</span>
            </div>
            ${sessions.length === 0 ? `<div class="sess-empty">No confirmed sessions yet.</div>` :
              sessions.map((b) => `
                <div class="sess-row">
                  <span class="who">${b.studentName} <span style="color:var(--ink-faint);font-weight:400;">(${b.gradeLevel})</span></span>
                  <span class="when">${b.email}</span>
                </div>
              `).join('')}
          </div>
        `;
      }).join('');

    }

    window.approveBooking = function (id) {
      const select = document.getElementById('assign-' + id);
      const chosenId = select ? select.value : '';
      const bookings = loadBookings();
      const b = bookings.find((x) => x.id === id);
      if (!b) return;
      const tutorId = chosenId || b.tutorId;
      if (!tutorId) { select && select.focus(); return; }
      const tutor = TUTORS.find((t) => t.id === tutorId);
      b.status = 'confirmed'; b.tutorId = tutor.id; b.tutorName = tutor.name;
      saveBookings(bookings);
      track('booking_approved', { subject: b.subject, tutor_id: tutorId, wait_minutes: Math.round((Date.now() - new Date(b.createdAt).getTime()) / 60000) }, 'dashboard');
      renderDashboard();
    };
    window.declineBooking = function (id) {
      const bookings = loadBookings();
      const b = bookings.find((x) => x.id === id);
      if (!b) return;
      b.status = 'declined';
      saveBookings(bookings);
      track('booking_declined', { subject: b.subject }, 'dashboard');
      renderDashboard();
    };

    renderDashboard();
    checkForNewRequests(); // establishes the baseline so seed/existing pending items don't "alert"
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission().then(() => renderDashboard());
    }
    setInterval(checkForNewRequests, 4000);
  }
})();
