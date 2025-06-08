// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyC0ssHxRUZfLjj_tnfNvYo2M0XM6PdkUxo",
  authDomain: "job-tracker-app-43908.firebaseapp.com",
  projectId: "job-tracker-app-43908",
  storageBucket: "job-tracker-app-43908.firebasestorage.app",
  messagingSenderId: "290524265470",
  appId: "1:290524265470:web:e2bf1b405763de26631eaf",
  measurementId: "G-7XE1Z7CTVQ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// DOM helpers
const $    = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// 1) Sign-in
$('btn-signin').onclick = () =>
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

// 2) After sign-in, show app
auth.onAuthStateChanged(user => {
  if (!user) return;
  hide($('auth'));
  show($('app'));
  setupReminderUI();
  loadJobs(user.uid);
});

// 3) Dynamic reminder fields
function setupReminderUI() {
  const container = $('reminders-container');
  const addBtn = $('add-reminder-btn');
  addBtn.onclick = () => {
    const count = container.querySelectorAll('.reminder-entry').length;
    if (count >= 3) return alert('Max 3 reminders');
    const entry = document.createElement('div');
    entry.className = 'reminder-entry';
    entry.innerHTML = `
      <input type="datetime-local" class="reminder-input"/>
      <button type="button">✖️</button>
    `;
    entry.querySelector('button').onclick = () => entry.remove();
    container.appendChild(entry);
  };
}

// 4) Load jobs from Firestore
async function loadJobs(uid) {
  const col  = db.collection('jobs').doc(uid).collection('list');
  const snap = await col.orderBy('deadline').get();
  window.jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderJobs();
  scheduleAllNotifications();
}

// 5) Render jobs
function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';
  window.jobs.forEach(job => {
    const li = document.createElement('li');
    li.className = 'job-item';
    li.innerHTML = `
      <h2>💼 ${job.position} @ 🏢 ${job.company}</h2>
      <div>📅 Due: ${job.deadline} • 📌 Type: ${job.jobType}</div>
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
      <div>🔗 <a href="${job.applyLink||'#'}" target="_blank">${job.applyLink?'Apply Link':''}</a></div>
      <div>📝 Notes: <span class="notes-text">${job.notes||''}</span>
        <button data-id="${job.id}" class="edit-notes">✏️</button>
      </div>
      <ul class="history">
        ${(job.history||[]).map(h => `<li>📌 [${h.date}] ${h.status}</li>`).join('')}
      </ul>
    `;
    ul.appendChild(li);
  });

  // 6) Delete
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      await db.collection('jobs').doc(auth.currentUser.uid)
              .collection('list').doc(id).delete();
      loadJobs(auth.currentUser.uid);
    };
  });

  // 7) Status change
  document.querySelectorAll('.status-select').forEach(sel => {
    sel.onchange = async () => {
      const id        = sel.dataset.id;
      const newStatus = sel.value;
      const ref       = db.collection('jobs').doc(auth.currentUser.uid)
                          .collection('list').doc(id);
      const date      = new Date().toISOString().slice(0,10);
      await ref.update({
        status: newStatus,
        history: firebase.firestore.FieldValue.arrayUnion({ status: newStatus, date })
      });
      loadJobs(auth.currentUser.uid);
    };
  });

  // 8) Edit notes inline
  document.querySelectorAll('.edit-notes').forEach(btn => {
    btn.onclick = () => {
      const id   = btn.dataset.id;
      const span = btn.previousElementSibling;
      const ta   = document.createElement('textarea');
      ta.value   = span.textContent;
      span.replaceWith(ta);
      ta.focus();
      ta.onblur = async () => {
        await db.collection('jobs').doc(auth.currentUser.uid)
                .collection('list').doc(id).update({ notes: ta.value });
        loadJobs(auth.currentUser.uid);
      };
    };
  });
}

// 9) Form submission
$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f         = e.target;
  const reminders = Array.from(
    document.querySelectorAll('.reminder-input')
  ).map(i => new Date(i.value).toISOString());
  const firstStatus = f.status.value;
  const todayDate   = new Date().toISOString().slice(0,10);

  await db.collection('jobs').doc(auth.currentUser.uid)
          .collection('list').add({
    company:   f.company.value,
    position:  f.position.value,
    deadline:  f.deadline.value,
    jobType:   f['job-type'].value,
    applyLink: f['apply-link'].value,
    reminders,
    notes:     f.notes.value || '',
    status:    firstStatus,
    history:   [{ status: firstStatus, date: todayDate }]
  });
  f.reset();
  $('reminders-container').innerHTML = '';
  loadJobs(auth.currentUser.uid);
};

// 10) Schedule notifications
function scheduleAllNotifications() {
  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }
  const now = Date.now();
  window.jobs.forEach(job => {
    (job.reminders||[]).forEach(rem => {
      const t     = new Date(rem).getTime();
      const delta = t - now;
      if (delta > 0 && delta < 1000*60*60*24*30) {
        setTimeout(() => {
          new Notification('🔔 Job Reminder', {
            body: `${job.position} @ ${job.company}`
          });
        }, delta);
      }
      else if (Math.abs(delta) < 1000*60) {
        new Notification('🔔 Job Reminder', {
          body: `${job.position} @ ${job.company}`
        });
      }
    });
  });
}
