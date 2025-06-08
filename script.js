// 1) Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC0ssHxRUZfLjj_tnfNvYo2M0XM6PdkUxo",
  authDomain: "job-tracker-app-43908.firebaseapp.com",
  projectId: "job-tracker-app-43908",
  storageBucket: "job-tracker-app-43908.firebasestorage.app",
  messagingSenderId: "290524265470",
  appId: "1:290524265470:web:e2bf1b405763de26631eaf",
  measurementId: "G-7XE1Z7CTVQ"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// 2) DOM helpers
const $    = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// 3) Priority map for sorting
const PRIORITY_VALUES = { High:3, Medium:2, Low:1 };

// 4) Ask notification permission
Notification.requestPermission().then(p => console.log("Notif perm:", p));

// 5) Sign-In & Sign-Out
$('btn-signin').onclick = () =>
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
$('btn-logout').onclick = () =>
  auth.signOut().catch(e => console.error('Sign-out error', e));

// 6) Sort controls
$('sort-deadline').onchange = () => renderJobs();
$('sort-priority').onchange = () => renderJobs();

// 7) Auth listener
auth.onAuthStateChanged(user => {
  if (user) {
    hide($('auth'));
    show($('app'));
    setupReminderUI();
    loadJobs(user.uid);
  } else {
    show($('auth'));
    hide($('app'));
  }
});

// 8) Dynamic reminders UI
function setupReminderUI() {
  const container = $('reminders-container');
  $('add-reminder-btn').onclick = () => {
    const count = container.querySelectorAll('.reminder-entry').length;
    if (count >= 3) return alert('Max 3 reminders');
    const div = document.createElement('div');
    div.className = 'reminder-entry';
    div.innerHTML = `
      <input type="datetime-local" class="reminder-input"/>
      <button type="button">✖️</button>
    `;
    div.querySelector('button').onclick = () => div.remove();
    container.appendChild(div);
  };
}

// 9) Load jobs & schedule
async function loadJobs(uid) {
  const snap = await db
    .collection('jobs').doc(uid).collection('list')
    .orderBy('deadline')
    .get();
  window.jobs = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  renderJobs();
  scheduleAllNotifications();
}

// 10) Render + Edit/Delete + Sorting
function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';

  // sort copy
  let list = [...window.jobs];
  // deadline
  const sd = $('sort-deadline').value;
  list.sort((a,b) => sd==='asc'
    ? new Date(a.deadline)-new Date(b.deadline)
    : new Date(b.deadline)-new Date(a.deadline)
  );
  // priority
  const sp = $('sort-priority').value;
  list.sort((a,b) => sp==='high'
    ? PRIORITY_VALUES[b.priority]-PRIORITY_VALUES[a.priority]
    : PRIORITY_VALUES[a.priority]-PRIORITY_VALUES[b.priority]
  );

  list.forEach(job => {
    const li = document.createElement('li');
    li.className = 'job-item';
    li.innerHTML = `
      <h2>💼 ${job.position} @ 🏢 ${job.company}</h2>
      <div>
        📅 Due: ${job.deadline} •
        ⭐ ${job.priority} •
        📂 ${job.jobType}
      </div>
      <div class="controls">
        <button data-id="${job.id}" class="edit-btn">✏️ Edit</button>
        <select data-id="${job.id}" class="status-select">
          <option${job.status==='To Apply'?' selected':''}>To Apply</option>
          <option${job.status==='Applied'?' selected':''}>Applied</option>
          <option${job.status==='Interviewing'?' selected':''}>Interviewing</option>
          <option${job.status==='Offer'?' selected':''}>Offer</option>
          <option${job.status==='Rejected'?' selected':''}>Rejected</option>
        </select>
        <button data-id="${job.id}" class="del-btn">🗑️ Delete</button>
      </div>
      <div>🔗 <a href="${job.applyLink||'#'}" target="_blank">
        ${job.applyLink?'Apply Link':''}
      </a></div>
      <div>📝 Notes: <span class="notes-text">${job.notes||''}</span>
        <button data-id="${job.id}" class="edit-notes">✏️</button>
      </div>
      <ul class="history">
        ${(job.history||[]).map(h =>
          `<li>📌 [${h.date}] ${h.status}</li>`
        ).join('')}
      </ul>
    `;
    ul.appendChild(li);
  });

  // Delete
  document.querySelectorAll('.del-btn').forEach(btn =>
    btn.onclick = async () => {
      await db.collection('jobs')
        .doc(auth.currentUser.uid)
        .collection('list')
        .doc(btn.dataset.id).delete();
      loadJobs(auth.currentUser.uid);
    }
  );

  // Status change
  document.querySelectorAll('.status-select').forEach(sel =>
    sel.onchange = async () => {
      const id = sel.dataset.id, newStatus = sel.value;
      const date = new Date().toISOString().slice(0,10);
      const ref = db.collection('jobs')
        .doc(auth.currentUser.uid)
        .collection('list')
        .doc(id);
      await ref.update({
        status: newStatus,
        history: firebase.firestore.FieldValue.arrayUnion({ status:newStatus, date })
      });
      loadJobs(auth.currentUser.uid);
    }
  );

  // Notes edit
  document.querySelectorAll('.edit-notes').forEach(btn =>
    btn.onclick = () => {
      const id = btn.dataset.id;
      const span = btn.previousElementSibling;
      const ta = document.createElement('textarea');
      ta.value = span.textContent;
      span.replaceWith(ta);
      ta.focus();
      ta.onblur = async () => {
        await db.collection('jobs')
          .doc(auth.currentUser.uid).collection('list')
          .doc(id).update({ notes: ta.value });
        loadJobs(auth.currentUser.uid);
      };
    }
  );

  // Job detail edit (populate form)
  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.onclick = () => {
      const id = btn.dataset.id;
      const job = window.jobs.find(j => j.id===id);
      if (!job) return;
      // fill form
      $('company').value = job.company;
      $('position').value = job.position;
      $('deadline').value = job.deadline;
      $('apply-link').value = job.applyLink || '';
      $('priority').value   = job.priority;
      $('status').value     = job.status;
      $('job-type').value   = job.jobType;
      $('notes').value      = job.notes || '';
      // clear old reminders
      const rc = $('reminders-container');
      rc.innerHTML = '';
      job.reminders.forEach(r => {
        const div = document.createElement('div');
        div.className = 'reminder-entry';
        div.innerHTML = `
          <input type="datetime-local" class="reminder-input" value="${r}"/>
          <button type="button">✖️</button>
        `;
        div.querySelector('button').onclick = () => div.remove();
        rc.appendChild(div);
      });
      // mark editing
      window.editingJobId = id;
      $('btn-submit').textContent = '🔄 Update';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  );
}

// 11) Form submission (add or update)
$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  const reminders = Array.from(
    document.querySelectorAll('.reminder-input')
  ).map(i => new Date(i.value).toISOString());

  const data = {
    company:   f.company.value,
    position:  f.position.value,
    deadline:  f.deadline.value,
    reminders,
    applyLink: f['apply-link'].value,
    priority:  f.priority.value,
    status:    f.status.value,
    jobType:   f['job-type'].value,
    notes:     f.notes.value,
  };

  const uid = auth.currentUser.uid;
  if (window.editingJobId) {
    // update existing
    const id = window.editingJobId;
    // if status changed, append history
    const old = window.jobs.find(j => j.id===id);
    if (old.status !== data.status) {
      const date = new Date().toISOString().slice(0,10);
      data.history = firebase.firestore.FieldValue.arrayUnion({
        status: data.status, date
      });
    }
    await db.collection('jobs').doc(uid)
      .collection('list').doc(id).update(data);
  } else {
    // new job, add history
    data.history = [{
      status: data.status,
      date: new Date().toISOString().slice(0,10)
    }];
    await db.collection('jobs').doc(uid)
      .collection('list').add(data);
  }

  // reset
  f.reset();
  $('reminders-container').innerHTML = '';
  $('btn-submit').textContent = '💾 Save';
  window.editingJobId = null;
  loadJobs(uid);
};

// 12) In-page notifications
function scheduleAllNotifications() {
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  const now = Date.now();
  window.jobs.forEach(job => {
    (job.reminders||[]).forEach(r => {
      const t = new Date(r).getTime();
      const delta = t - now;
      if (delta > 0) {
        setTimeout(() => {
          new Notification('🔔 Job Reminder', {
            body: `${job.position} @ ${job.company}`
          });
        }, delta);
      } else if (Math.abs(delta) < 60000) {
        new Notification('🔔 Job Reminder', {
          body: `${job.position} @ ${job.company}`
        });
      }
    });
  });
}
