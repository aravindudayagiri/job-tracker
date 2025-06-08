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

// 4) Request Notification permission
Notification.requestPermission().then(p => console.log("Notif perm:", p));

// 5) Sign-In & Sign-Out
$('btn-signin').onclick = () =>
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
$('btn-logout').onclick = () =>
  auth.signOut().catch(err => console.error("Sign-out error:", err));

// 6) Listen for auth state
auth.onAuthStateChanged(user => {
  if (user) {
    // User signed in
    hide($('auth'));
    show($('app'));
    loadJobs(user.uid);
  } else {
    // User signed out
    show($('auth'));
    hide($('app'));
  }
});

// 7) Load jobs from Firestore
async function loadJobs(uid) {
  const snap = await db
    .collection('jobs')
    .doc(uid)
    .collection('list')
    .orderBy('deadline')
    .get();
  window.jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderJobs();
  scheduleAllNotifications();
}

// 8) Render job list
function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';
  window.jobs.forEach(job => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${job.position}</strong> @ ${job.company}<br>
      Due: ${job.deadline} • Priority: ${job.priority}
    `;
    ul.appendChild(li);
  });
}

// 9) Handle form submission
$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  await db
    .collection('jobs')
    .doc(auth.currentUser.uid)
    .collection('list')
    .add({
      company:  f.company.value,
      position: f.position.value,
      deadline: f.deadline.value,
      priority: f.priority.value
    });
  f.reset();
  loadJobs(auth.currentUser.uid);
};

// 10) Schedule in-page notifications
function scheduleAllNotifications() {
  if (Notification.permission !== 'granted') return;
  const now = Date.now();
  window.jobs.forEach(job => {
    // remind at 9:00 on due date
    const remindAt = new Date(job.deadline);
    remindAt.setHours(9, 0, 0, 0);
    const delta = remindAt.getTime() - now;

    console.log(`Scheduling "${job.position}" in ${Math.round(delta/1000)}s`);

    if (delta > 0) {
      setTimeout(() => {
        console.log(`🔔 Notifying "${job.position}" now`);
        new Notification("Job Reminder", {
          body: `${job.position} @ ${job.company} (due ${job.deadline})`
        });
      }, delta);
    } else if (Math.abs(delta) < 60 * 1000) {
      // just-missed, fire immediately
      new Notification("Job Reminder", {
        body: `${job.position} @ ${job.company} (due ${job.deadline})`
      });
    }
  });
}
