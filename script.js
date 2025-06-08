// ========================
// 1) Firebase & DOM setup
// ========================
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

const $    = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// ========================
// 2) Ask notification perm
// ========================
Notification.requestPermission().then(p => {
  console.log("Notification permission:", p);
});

// ========================
// 3) Auth flow
// ========================
$('btn-signin').onclick = () =>
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

auth.onAuthStateChanged(user => {
  if (!user) return;
  hide($('auth'));
  show($('app'));
  loadJobs(user.uid);
});

// ========================
// 4) Load + render + schedule
// ========================
async function loadJobs(uid) {
  const snap = await db.collection('jobs')
                       .doc(uid)
                       .collection('list')
                       .orderBy('deadline')
                       .get();
  window.jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderJobs();
  scheduleAllNotifications();
}

function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';
  window.jobs.forEach(job => {
    const li = document.createElement('li');
    li.className = 'job-item';
    li.innerHTML = `
      <strong>${job.position} @ ${job.company}</strong><br>
      Due: ${job.deadline}
    `;
    ul.appendChild(li);
  });
}

// ========================
// 5) Form handler
// ========================
$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  const reminders = [
    f.rem1 && f.rem1.value,
    f.rem2 && f.rem2.value,
    f.rem3 && f.rem3.value
  ].filter(v => v);

  await db.collection('jobs')
          .doc(auth.currentUser.uid)
          .collection('list')
          .add({
            company:   f.company.value,
            position:  f.position.value,
            deadline:  f.deadline.value,
            reminders,             // ISO strings
          });

  f.reset();
  loadJobs(auth.currentUser.uid);
};

// ========================
// 6) Scheduling logic
// ========================
function scheduleAllNotifications() {
  if (Notification.permission !== 'granted') {
    console.warn("No notification permission—cannot schedule alerts");
    return;
  }

  const now = Date.now();
  console.log(`Scheduling notifications for ${window.jobs.length} jobs`);

  window.jobs.forEach(job => {
    (job.reminders || []).forEach(rem => {
      const t     = new Date(rem).getTime();
      const delta = t - now;

      console.log(
        `→ Job "${job.position}" reminder at ${rem} ` +
        `(in ${Math.round(delta/1000)}s)`
      );

      if (delta > 0) {
        setTimeout(() => {
          console.log(`🔔 Firing notification for "${job.position}" now`);
          new Notification("Job Reminder", {
            body: `${job.position} @ ${job.company}\nDue: ${job.deadline}`
          });
        }, delta);
      } else if (Math.abs(delta) < 60000) {
        // if it was due in the last minute, fire ASAP
        console.log(`⚠️ Late-fire notification for "${job.position}" now`);
        new Notification("Job Reminder", {
          body: `${job.position} @ ${job.company}\nDue: ${job.deadline}`
        });
      }
    });
  });
}
