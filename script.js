// script.js
// We're in module mode, so we can import ESM or grab from window._FB
const { auth, db } = window._FB;
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// ————————————————————————————
// UI Helpers
const $   = id=>document.getElementById(id);
const show = el=>el.classList.remove('hidden');
const hide = el=>el.classList.add('hidden');

// Auth elements
const authScreen  = $('auth-screen');
const appScreen   = $('app-screen');
const btnLogin    = $('btn-login');
const btnSignup   = $('btn-signup');
const btnLogout   = $('btn-logout');
const loginEmail  = $('login-email');
const loginPass   = $('login-password');
const signupEmail = $('signup-email');
const signupPass  = $('signup-password');
const authError   = $('auth-error');
const userEmailEl = $('user-email');

// Job elements
const jobForm   = $('job-form');
const jobsUl    = $('jobs');
const formError = $('form-error');

// 1️⃣ Sign Up
btnSignup.onclick = async () => {
  authError.textContent = '';
  const email = signupEmail.value, pw = signupPass.value;
  if (!email||!pw) return authError.textContent='Enter email & password.';
  try {
    await createUserWithEmailAndPassword(auth, email, pw);
  } catch(e) {
    authError.textContent = e.message;
  }
};

// 2️⃣ Log In
btnLogin.onclick = async () => {
  authError.textContent = '';
  const email = loginEmail.value, pw = loginPass.value;
  if (!email||!pw) return authError.textContent='Enter email & password.';
  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch(e) {
    authError.textContent = e.message;
  }
};

// 3️⃣ Log Out
btnLogout.onclick = () => signOut(auth);

// 4️⃣ React to Auth State
let unsubscribe = null;
onAuthStateChanged(auth, user => {
  if (user) {
    // show main app
    $('user-email').textContent = user.email;
    hide(authScreen); show(appScreen);

    // start syncing this user’s jobs
    const jobsCol = collection(db, 'users', user.uid, 'jobs');
    const q       = query(jobsCol, orderBy('timestamp'));
    unsubscribe  = onSnapshot(q, snap => {
      jobsUl.innerHTML = '';
      snap.forEach(docSnap => {
        const data = docSnap.data();
        renderJob(docSnap.id, data);
      });
    });
  } else {
    // back to login/signup
    unsubscribe && unsubscribe();
    show(authScreen); hide(appScreen);
  }
});

// 5️⃣ Render one job
function renderJob(id, job) {
  const li = document.createElement('li');
  li.className = 'job-item';
  li.dataset.priority = job.priority;

  // build history list
  const historyHtml = (job.history||[])
    .map(h=>`<li>${h.date}: ${h.status}</li>`)
    .join('');

  li.innerHTML = `
    <h3>${job.position} @ ${job.company}</h3>
    <p><strong>Deadline:</strong> ${job.deadline}</p>
    <p><strong>Status:</strong> ${job.status}</p>
    ${historyHtml?`<div class="history"><ul>${historyHtml}</ul></div>`:''}
    <div class="actions">
      <button onclick="deleteJob('${id}')">🗑️</button>
    </div>
  `;
  jobsUl.appendChild(li);
}

// 6️⃣ Add a new job
jobForm.onsubmit = async e => {
  e.preventDefault();
  formError.textContent = '';
  const c = $('company').value,
        p = $('position').value,
        d = $('deadline').value;
  if(!c||!p||!d) return formError.textContent='Company, Position & Deadline are required.';

  const user = auth.currentUser;
  const jobsCol = collection(db, 'users', user.uid, 'jobs');
  await addDoc(jobsCol, {
    company: c,
    position: p,
    deadline: d,
    link: $('link').value,
    priority: $('priority').value,
    status: $('status').value,
    notes: $('notes').value,
    history: [{ status: $('status').value, date: new Date().toISOString().slice(0,10) }],
    timestamp: serverTimestamp()
  });

  jobForm.reset();
};

// 7️⃣ Delete a job
window.deleteJob = async id => {
  const user = auth.currentUser;
  const docRef = doc(db, 'users', user.uid, 'jobs', id);
  await deleteDoc(docRef);
};
// script.js
// We're in module mode, so we can import ESM or grab from window._FB
const { auth, db } = window._FB;
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// ————————————————————————————
// UI Helpers
const $   = id=>document.getElementById(id);
const show = el=>el.classList.remove('hidden');
const hide = el=>el.classList.add('hidden');

// Auth elements
const authScreen  = $('auth-screen');
const appScreen   = $('app-screen');
const btnLogin    = $('btn-login');
const btnSignup   = $('btn-signup');
const btnLogout   = $('btn-logout');
const loginEmail  = $('login-email');
const loginPass   = $('login-password');
const signupEmail = $('signup-email');
const signupPass  = $('signup-password');
const authError   = $('auth-error');
const userEmailEl = $('user-email');

// Job elements
const jobForm   = $('job-form');
const jobsUl    = $('jobs');
const formError = $('form-error');

// 1️⃣ Sign Up
btnSignup.onclick = async () => {
  authError.textContent = '';
  const email = signupEmail.value, pw = signupPass.value;
  if (!email||!pw) return authError.textContent='Enter email & password.';
  try {
    await createUserWithEmailAndPassword(auth, email, pw);
  } catch(e) {
    authError.textContent = e.message;
  }
};

// 2️⃣ Log In
btnLogin.onclick = async () => {
  authError.textContent = '';
  const email = loginEmail.value, pw = loginPass.value;
  if (!email||!pw) return authError.textContent='Enter email & password.';
  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch(e) {
    authError.textContent = e.message;
  }
};

// 3️⃣ Log Out
btnLogout.onclick = () => signOut(auth);

// 4️⃣ React to Auth State
let unsubscribe = null;
onAuthStateChanged(auth, user => {
  if (user) {
    // show main app
    $('user-email').textContent = user.email;
    hide(authScreen); show(appScreen);

    // start syncing this user’s jobs
    const jobsCol = collection(db, 'users', user.uid, 'jobs');
    const q       = query(jobsCol, orderBy('timestamp'));
    unsubscribe  = onSnapshot(q, snap => {
      jobsUl.innerHTML = '';
      snap.forEach(docSnap => {
        const data = docSnap.data();
        renderJob(docSnap.id, data);
      });
    });
  } else {
    // back to login/signup
    unsubscribe && unsubscribe();
    show(authScreen); hide(appScreen);
  }
});

// 5️⃣ Render one job
function renderJob(id, job) {
  const li = document.createElement('li');
  li.className = 'job-item';
  li.dataset.priority = job.priority;

  // build history list
  const historyHtml = (job.history||[])
    .map(h=>`<li>${h.date}: ${h.status}</li>`)
    .join('');

  li.innerHTML = `
    <h3>${job.position} @ ${job.company}</h3>
    <p><strong>Deadline:</strong> ${job.deadline}</p>
    <p><strong>Status:</strong> ${job.status}</p>
    ${historyHtml?`<div class="history"><ul>${historyHtml}</ul></div>`:''}
    <div class="actions">
      <button onclick="deleteJob('${id}')">🗑️</button>
    </div>
  `;
  jobsUl.appendChild(li);
}

// 6️⃣ Add a new job
jobForm.onsubmit = async e => {
  e.preventDefault();
  formError.textContent = '';
  const c = $('company').value,
        p = $('position').value,
        d = $('deadline').value;
  if(!c||!p||!d) return formError.textContent='Company, Position & Deadline are required.';

  const user = auth.currentUser;
  const jobsCol = collection(db, 'users', user.uid, 'jobs');
  await addDoc(jobsCol, {
    company: c,
    position: p,
    deadline: d,
    link: $('link').value,
    priority: $('priority').value,
    status: $('status').value,
    notes: $('notes').value,
    history: [{ status: $('status').value, date: new Date().toISOString().slice(0,10) }],
    timestamp: serverTimestamp()
  });

  jobForm.reset();
};

// 7️⃣ Delete a job
window.deleteJob = async id => {
  const user = auth.currentUser;
  const docRef = doc(db, 'users', user.uid, 'jobs', id);
  await deleteDoc(docRef);
};
