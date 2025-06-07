import {
  auth, db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection, doc, setDoc, onSnapshot, deleteDoc
} from './index.html'; // uses the window.fb exports

// UI elements
const authC  = document.getElementById('auth-container');
const appC   = document.getElementById('app-container');
const signup = document.getElementById('signup-form');
const login  = document.getElementById('login-form');
const logout = document.getElementById('logout-btn');
const jobsUl = document.getElementById('jobs');
const form   = document.getElementById('job-form');

// 1) Auth flows
signup.addEventListener('submit', e => {
  e.preventDefault();
  createUserWithEmailAndPassword(auth,
    e.target['signup-email'].value,
    e.target['signup-password'].value
  );
});

login.addEventListener('submit', e => {
  e.preventDefault();
  signInWithEmailAndPassword(auth,
    e.target['login-email'].value,
    e.target['login-password'].value
  );
});

logout.onclick = () => signOut(auth);

// 2) React to auth state
let unsubscribeJobs = null;
onAuthStateChanged(auth, user => {
  if (user) {
    authC .classList.add('hidden');
    appC  .classList.remove('hidden');
    startJobSync(user.uid);
  } else {
    authC .classList.remove('hidden');
    appC  .classList.add('hidden');
    if (unsubscribeJobs) unsubscribeJobs();
  }
});

// 3) Firestore sync per user
function startJobSync(uid) {
  const jobsCol = collection(db, 'users', uid, 'jobs');
  unsubscribeJobs = onSnapshot(jobsCol, snapshot => {
    jobsUl.innerHTML = '';
    snapshot.forEach(docSnap => {
      const job = docSnap.data();
      const li  = document.createElement('li');
      li.textContent = `${job.position} @ ${job.company} (${job.status})`;
      jobsUl.appendChild(li);
    });
  });
}

// 4) Add job → Firestore
form.addEventListener('submit', async e => {
  e.preventDefault();
  const user = auth.currentUser;
  const data = {
    company:  e.target.company.value,
    position: e.target.position.value,
    deadline: e.target.deadline.value,
    status:   e.target.status.value,
    priority: e.target.priority.value,
    notes:    e.target.notes.value,
    history:  [{status:e.target.status.value,date:new Date().toISOString()}]
  };
  await setDoc(
    doc(db, 'users', user.uid, 'jobs', Date.now().toString()),
    data
  );
  form.reset();
});
