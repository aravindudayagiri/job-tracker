// shortcuts
const auth = firebase.auth();
const db   = firebase.firestore();
const uidKey = 'job-uid';

// UI refs
const authC = document.getElementById('auth-container');
const appC  = document.getElementById('app-container');
const signupForm = document.getElementById('signup-form');
const loginForm  = document.getElementById('login-form');
const logoutBtn  = document.getElementById('logout-btn');
const jobForm    = document.getElementById('job-form');
const jobsList   = document.getElementById('jobs');

// 1) Sign up
signupForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = signupForm['signup-email'].value;
  const pass  = signupForm['signup-password'].value;
  auth.createUserWithEmailAndPassword(email, pass)
    .catch(console.error);
});

// 2) Log in
loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const email = loginForm['login-email'].value;
  const pass  = loginForm['login-password'].value;
  auth.signInWithEmailAndPassword(email, pass)
    .catch(console.error);
});

// 3) Log out
logoutBtn.onclick = () => auth.signOut();

// 4) React to auth changes
auth.onAuthStateChanged(user => {
  if (user) {
    authC.classList.add('hidden');
    appC.classList.remove('hidden');
    // start listening to this user’s jobs
    startSync(user.uid);
  } else {
    appC.classList.add('hidden');
    authC.classList.remove('hidden');
  }
});

// 5) Firestore sync
let unsubscribe = null;
function startSync(uid) {
  if (unsubscribe) unsubscribe();
  const col = db.collection('users').doc(uid).collection('jobs');
  unsubscribe = col.onSnapshot(snap => {
    jobsList.innerHTML = '';
    snap.forEach(doc => {
      const data = doc.data();
      const li = document.createElement('li');
      li.className = 'job-item';
      li.dataset.priority = data.priority;
      li.innerHTML = `
        <h3>${data.position} @ ${data.company}</h3>
        <p>Status: ${data.status}</p>
        <div class="actions">
          <button onclick="deleteJob('${doc.id}')">🗑️</button>
        </div>`;
      jobsList.appendChild(li);
    });
  });
}

// 6) Add a new job
jobForm.addEventListener('submit', e => {
  e.preventDefault();
  const uid = auth.currentUser.uid;
  const col = db.collection('users').doc(uid).collection('jobs');
  const job = {
    company:  jobForm.company.value,
    position: jobForm.position.value,
    deadline: jobForm.deadline.value,
    link:     jobForm.link.value,
    priority: jobForm.priority.value,
    status:   jobForm.status.value,
    notes:    jobForm.notes.value,
    history:  [{ status: jobForm.status.value, date: new Date().toISOString() }]
  };
  col.add(job).catch(console.error);
  jobForm.reset();
});
