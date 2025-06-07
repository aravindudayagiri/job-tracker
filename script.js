// expose initGapi
window.initGapi = initGapi;

// ── CONFIG ───────────────────────────────
const CLIENT_ID = '1008402588740-4pcktur9ascnaqobn81d91p0sk3ddt06.apps.googleusercontent.com';
const API_KEY   = 'AIzaSyCXWCjAko5B-5eOlcddAgLuwAyguir_7hc';
const DRIVE_FILE_NAME = 'jobs.json';

// ── HELPERS ──────────────────────────────
const $ = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// ── 1) INITIALIZE GAPI + DRIVE ───────────
async function initGapi() {
  console.log('initGapi');
  gapi.load('client:auth2', async () => {
    await gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
      ],
      scope: 'https://www.googleapis.com/auth/drive.appdata'
    });
    console.log('gapi init done, drive:', !!gapi.client.drive);
    attachSignin($('btn-google-signin'), gapi.auth2.getAuthInstance());
  });
}

// ── 2) SIGN-IN BUTTON ─────────────────────
function attachSignin(btn, authInstance) {
  btn.onclick = async () => {
    console.log('Sign-in clicked');
    try {
      await authInstance.signIn();
      console.log('Signed in as', authInstance.currentUser.get().getBasicProfile().getEmail());
      hide($('auth'));
      show($('app'));
      await loadJobsFromDrive();
    } catch (e) {
      console.error(e);
      alert('Sign-in failed; see console.');
    }
  };
}

// ── 3) LOAD jobs.json ────────────────────
async function loadJobsFromDrive() {
  try {
    const list = await gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: `name='${DRIVE_FILE_NAME}'`
    });
    if (list.result.files.length) {
      const fileId = list.result.files[0].id;
      const getRes = await gapi.client.drive.files.get({
        fileId, alt: 'media'
      });
      window.jobs = getRes.result.jobs || [];
    } else {
      window.jobs = [];
    }
  } catch (e) {
    console.error(e);
    window.jobs = [];
  }
  renderJobs();
}

// ── 4) SAVE jobs.json ────────────────────
async function saveJobsToDrive() {
  const metadata = { name: DRIVE_FILE_NAME, parents: ['appDataFolder'] };
  const media = {
    mimeType: 'application/json',
    body: JSON.stringify({ jobs: window.jobs }, null, 2)
  };
  const list = await gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${DRIVE_FILE_NAME}'`
  });
  if (list.result.files.length) {
    const fileId = list.result.files[0].id;
    await gapi.client.drive.files.update({ fileId, resource: metadata, media });
  } else {
    await gapi.client.drive.files.create({ resource: metadata, media, fields: 'id' });
  }
}

// ── 5) RENDER & INTERACT ─────────────────
function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';
  (window.jobs||[]).forEach((job,i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${job.position}</strong> @ ${job.company}<br>
      Deadline: ${job.deadline} • Status: ${job.status}
      <button onclick="deleteJob(${i})">🗑️</button>
    `;
    ul.appendChild(li);
  });
}

window.deleteJob = async i => {
  window.jobs.splice(i,1);
  await saveJobsToDrive();
  renderJobs();
};

$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  window.jobs.push({
    company:  f.company.value,
    position: f.position.value,
    deadline: f.deadline.value,
    link:     f.link.value,
    priority: f.priority.value,
    status:   f.status.value,
    notes:    f.notes.value,
    history:  [{ status: f.status.value, date: new Date().toISOString().slice(0,10) }]
  });
  await saveJobsToDrive();
  renderJobs();
  f.reset();
};

// ── 6) (Optional) SW REGISTRATION ────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('sw.js')
    .then(reg => console.log('SW registered', reg.scope))
    .catch(err => console.error(err));
}
