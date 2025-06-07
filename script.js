// script.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

import {
  collection,
  addDoc,
  deleteDoc,
  doc,               // ← import doc
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const { auth, db } = window.FB;
const $   = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// UI elements
const authScreen  = $('auth-screen');
const appScreen   = $('app-screen');
const btnLogin    = $('btn-login');
const btnSignup   = $('btn-signup');
const btnLogout   = $('btn-logout');
const loginEmail  = $('login-email');
const loginPass   = $('login-password');
const signupEmail = $('signup-email');
const signupPass  = $('signup-password');
const authErr     = $('auth-error');
const userEmailEl = $('user-email');

const jobForm   = $('job-form');
const formErr   = $('form-error');
const jobsUl    = $('jobs');
const prog      = $('form-progress');

// Toggle between login & signup forms
$('show-signup').onclick = e => { e.preventDefault(); hide($('login')); show($('signup')); };
$('show-login').onclick  = e => { e.preventDefault(); hide($('signup')); show($('login')); };

// Sign up
btnSignup.onclick = async () => {
  authErr.textContent = '';
  try {
    await createUserWithEmailAndPassword(auth, signupEmail.value, signupPass.value);
  } catch (e) {
    console.error("Signup failed:", e);
    authErr.textContent = e.message;
  }
};

// Log in
btnLogin.onclick = async () => {
  authErr.textContent = '';
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPass.value);
  } catch (e) {
    console.error("Login failed:", e);
    authErr.textContent = e.message;
  }
};

// Log out
btnLogout.onclick = () => signOut(auth);

// Watch auth state
let unsubscribe = null;
onAuthStateChanged(auth, user => {
  if (user) {
    userEmailEl.textContent = user.email;
    hide(authScreen); show(appScreen);

    // Listen to this user's jobs collection
    const jobsCol = collection(db, 'users', user.uid, 'jobs');
    const q       = query(jobsCol, orderBy('timestamp'));
    unsubscribe  = onSnapshot(q, snapshot => {
      jobsUl.innerHTML = '';
      snapshot.forEach(docSnap => renderJob(docSnap.id, docSnap.data()));
    });
  } else {
    unsubscribe && unsubscribe();
    show(authScreen); hide(appScreen);
    hide($('signup')); show($('login'));
  }
});

// Render a single job item
function renderJob(id, job) {
  const li = document.createElement('li');
  li.className = 'job-item';
  li.dataset.priority = job.priority;

  const historyHtml = (job.history || [])
    .map(h => `<li>${h.date}: ${h.status}</li>`)
    .join('');

  li.innerHTML = `
    <h3>${job.position} @ ${job.company}</h3>
    <p><strong>Deadline:</strong> ${job.deadline}</p>
    <p><strong>Status:</strong> ${job.status}</p>
    ${historyHtml ? `<div class="history"><ul>${historyHtml}</ul></div>` : ''}
    <div class="actions">
      <button onclick="deleteJob('${id}')">🗑️</button>
    </div>`;
  jobsUl.appendChild(li);
}

// Progress bar update
['company','position','deadline'].forEach(id =>
  $(id).addEventListener('input', () => {
    const filled = ['company','position','deadline']
      .filter(f => $(f).value).length;
    prog.value = (filled / 3) * 100;
  })
);

// Add a new job
jobForm.onsubmit = async e => {
  e.preventDefault();
  formErr.textContent = '';

  // Basic validation
  if (!$('company').value || !$('position').value || !$('deadline').value) {
    return formErr.textContent = 'Company, Position & Deadline are required.';
  }

  const user = auth.currentUser;
  const data = {
    company:   $('company').value,
    position:  $('position').value,
    deadline:  $('deadline').value,
    link:      $('link').value,
    priority:  $('priority').value,
    status:    $('status').value,
    notes:     $('notes').value,
    history:   [{ status: $('status').value, date: new Date().toISOString().slice(0,10) }],
    timestamp: serverTimestamp()
  };

  try {
    const colRef = collection(db, 'users', user.uid, 'jobs');
    await addDoc(colRef, data);
    jobForm.reset();
    prog.value = 0;
  } catch (e) {
    console.error("Error adding job:", e);
    formErr.textContent = 'Could not save job. Try again.';
  }
};

// Delete a job
window.deleteJob = async id => {
  const user = auth.currentUser;
  try {
    const docRef = doc(db, 'users', user.uid, 'jobs', id);
    await deleteDoc(docRef);
  } catch (e) {
    console.error("Error deleting job:", e);
    alert('Could not delete job.');
  }
};
