// 1) Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC0ssHxRUZfLjj_tnfNvYo2M0XM6PdkUxo",
  authDomain: "job-tracker-app-43908.firebaseapp.com",
  projectId: "job-tracker-app-43908",
  storageBucket: "job-tracker-app-43908.firebasestorage.app",
  messagingSenderId: "290524265470",
  appId: "1:290524265470:web:e2bf1b405763de26631eaf",
  measurementId: "G-7XE1Z7CTVQ"
};

// 2) Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// 3) DOM helpers
const $    = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// 4) Sign-in button
$('btn-signin').onclick = () =>
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

// 5) After auth, show UI & load jobs
auth.onAuthStateChanged(user => {
  if (!user) return;
  hide($('auth'));
  show($('app'));
  loadJobs(user.uid);
});

// 6) Load all jobs from Firestore
async function loadJobs(uid) {
  const col  = db.collection('jobs').doc(uid).collection('list');
  const snap = await col.orderBy('deadline').get();
  window.jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderJobs();
  scheduleAllNotifications();
}

// 7) Render job list with status, notes, history
function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';
  window.jobs.forEach(job => {
    const li = document.createElement('li');
    li.className = 'job-item';
    li.innerHTML = `
      <h2>💼 ${job.position} @ 🏢 ${job.company}</h2>
      <div>📅 Due: ${job.deadline}</div>
      <div class="controls">
        <select data-id="${job.id}" class="status-select">
          <option${job.status==='To Apply'?' selected':''}>To Apply</option>
          <option${job.status==='Applied'?' selected':''}>Applied</option>
          <option${job.status==='Interviewing'?' selected':''}>Interviewing</option>
          <option${job.status==='Offer'?' selected':''}>Offer</option>
          <option${job.status==='Rejected'?' selected':''}>Rejected</option>
        </select>
        <button data-id="${job.id}" class="del-btn">🗑️ Delete</button>
      </div>
      <div>
        <strong>📝 Notes:</strong>
        <span class="notes-text">${job.notes||''}</span>
        <button data-id="${job.id}" class="edit-notes">✏️</button>
      </div>
      <ul class="history">
        ${(job.history||[]).map(h => `<li>📌 [${h.date}] ${h.status}</li>`).join('')}
      </ul>
    `;
    ul.appendChild(li);
  });

  // 8) Wire up delete buttons
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      await db.collection('jobs')
              .doc(auth.currentUser.uid)
              .collection('list')
              .doc(id)
              .delete();
      loadJobs(auth.currentUser.uid);
    };
  });

  // 9) Wire up status changes
  document.querySelectorAll('.status-select').forEach(sel => {
    sel.onchange = async () => {
      const id        = sel.dataset.id;
      const newStatus = sel.value;
      const ref       = db.collection('jobs')
                           .doc(auth.currentUser.uid)
                           .collection('list')
                           .doc(id);
      const date      = new Date().toISOString().slice(0,10);
      await ref.update({
        status: newStatus,
        history: firebase.firestore.FieldValue.arrayUnion({ status: newStatus, date })
      });
      loadJobs(auth.currentUser.uid);
    };
  });

  // 10) In-place notes editing
  document.querySelectorAll('.edit-notes').forEach(btn => {
    btn.onclick = () => {
      const id   = btn.dataset.id;
      const span = btn.previousElementSibling;
      const ta   = document.createElement('textarea');
      ta.value   = span.textContent;
      span.replaceWith(ta);
      ta.focus();
      ta.onblur = async () => {
        await db.collection('jobs')
                .doc(auth.currentUser.uid)
                .collection('list')
                .doc(id)
                .update({ notes: ta.value });
        loadJobs(auth.currentUser.uid);
      };
    };
  });
}

// 11) Handle new job submissions (with up to 3 custom reminders)
$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f         = e.target;
  const reminders = [f.rem1.value, f.rem2.value, f.rem3.value]
    .filter(v => v)
    .map(v => new Date(v).toISOString());
  const firstStatus = 'To Apply';
  const todayDate   = new Date().toISOString().slice(0,10);

  await db.collection('jobs')
          .doc(auth.currentUser.uid)
          .collection('list')
          .add({
            company:   f.company.value,
            position:  f.position.value,
            deadline:  f.deadline.value,
            reminders,
            notes:     f.notes.value || '',
            status:    firstStatus,
            history:   [{ status: firstStatus, date: todayDate }]
          });
  f.reset();
  loadJobs(auth.currentUser.uid);
};

// 12) Schedule all notifications (custom times & “missed within 1 min”)
function scheduleAllNotifications() {
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  const now = Date.now();
  window.jobs.forEach(job => {
    (job.reminders || []).forEach(rem => {
      const t     = new Date(rem).getTime();
      const delta = t - now;
      // schedule only if within next 30 days
      if (delta > 0 && delta < 1000 * 60 * 60 * 24 * 30) {
        setTimeout(() => {
          new Notification('🔔 Job Reminder', {
            body: `${job.position} @ ${job.company}`
          });
        }, delta);
      } else if (Math.abs(delta) < 1000 * 60) {
        // if just missed in the last minute, fire now
        new Notification('🔔 Job Reminder', {
          body: `${job.position} @ ${job.company}`
        });
      }
    });
  });
}
