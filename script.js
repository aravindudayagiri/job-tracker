// 1) Your Firebase config (from Step 3)
const firebaseConfig = {
  apiKey: "AIzaSyC0ssHxRUZfLjj_tnfNvYo2M0XM6PdkUxo",
  authDomain: "job-tracker-app-43908.firebaseapp.com",
  projectId: "job-tracker-app-43908",
  storageBucket: "job-tracker-app-43908.firebasestorage.app",
  messagingSenderId: "290524265470",
  appId: "1:290524265470:web:e2bf1b405763de26631eaf",
  measurementId: "G-7XE1Z7CTVQ"
};

// 2) Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// 3) DOM helpers
const $    = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// 4) Sign in button
$('btn-signin').onclick = () =>
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());

// 5) After auth, show UI & load jobs
auth.onAuthStateChanged(user => {
  if (!user) return;
  hide($('auth'));
  show($('app'));
  loadJobs(user.uid);
});

// 6) Load jobs from Firestore
async function loadJobs(uid) {
  const col = db.collection('jobs').doc(uid).collection('list');
  const snap = await col.orderBy('deadline').get();
  window.jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderJobs();
  notifyOnLoad();
}

// 7) Render list
function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';
  (window.jobs || []).forEach(job => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${job.company}</strong> — ${job.position}<br>
      Due: ${job.deadline} • Priority: ${job.priority}
    `;
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.onclick = async () => {
      await db.collection('jobs')
              .doc(auth.currentUser.uid)
              .collection('list')
              .doc(job.id)
              .delete();
      loadJobs(auth.currentUser.uid);
    };
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

// 8) Add new job
$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  await db.collection('jobs')
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

// 9) Browser notifications on load
async function notifyOnLoad() {
  if (Notification.permission !== 'granted')
    await Notification.requestPermission();
  if (Notification.permission !== 'granted') return;

  const today = new Date().toISOString().slice(0,10);
  window.jobs.forEach(job => {
    const lead = job.priority==='High'?0:(job.priority==='Medium'?1:2);
    const d = new Date(job.deadline);
    d.setDate(d.getDate() - lead);
    if (d.toISOString().slice(0,10)===today) {
      new Notification('Job Reminder', {
        body: `${job.position} @ ${job.company}`
      });
    }
  });
}
