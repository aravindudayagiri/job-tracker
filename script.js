// Expose initGapi for the HTML onload
window.initGapi = initGapi;

// === Your Google creds ===
const CLIENT_ID = '1008402588740-4pcktur9ascnaqobn81d91p0sk3ddt06.apps.googleusercontent.com';
const API_KEY   = 'AIzaSyCXWCjAko5B-5eOlcddAgLuwAyguir_7hc';
const DRIVE_FILE_NAME = 'jobs.json';

// DOM helpers
const $ = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// 1) Init gapi with Drive discovery, API key, and auth2
function initGapi() {
  gapi.load('client:auth2', async () => {
    await gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: [
        'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
      ],
      scope: 'https://www.googleapis.com/auth/drive.appdata'
    });
    attachSignin($('btn-google-signin'), gapi.auth2.getAuthInstance());
  });
}

// 2) Sign-in button wiring
function attachSignin(btn, authInstance) {
  btn.onclick = async () => {
    try {
      await authInstance.signIn();
      hide($('auth'));
      show($('app'));
      await loadJobsFromDrive();
    } catch (e) {
      console.error('Google sign-in error:', e);
      alert('Sign-in failed; see console.');
    }
  };
}

// 3) Load (or init) jobs.json from Drive AppData
async function loadJobsFromDrive() {
  try {
    const listResp = await gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: `name='${DRIVE_FILE_NAME}'`
    });
    if (listResp.result.files.length) {
      const fileId = listResp.result.files[0].id;
      const getResp = await gapi.client.drive.files.get({
        fileId,
        alt: 'media'
      });
      window.jobs = getResp.result.jobs || [];
    } else {
      window.jobs = [];
    }
  } catch (e) {
    console.error('Error loading jobs from Drive:', e);
    window.jobs = [];
  }
  renderJobs();
  remindUpcoming();
}

// 4) Save (create/update) jobs.json in Drive AppData
async function saveJobsToDrive() {
  const metadata = { name: DRIVE_FILE_NAME, parents: ['appDataFolder'] };
  const media = {
    mimeType: 'application/json',
    body: JSON.stringify({ jobs: window.jobs }, null, 2)
  };

  const listResp = await gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${DRIVE_FILE_NAME}'`
  });

  if (listResp.result.files.length) {
    const fileId = listResp.result.files[0].id;
    await gapi.client.drive.files.update({
      fileId,
      resource: metadata,
      media
    });
  } else {
    await gapi.client.drive.files.create({
      resource: metadata,
      media,
      fields: 'id'
    });
  }
}

// 5) Render UI
function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';
  (window.jobs || []).forEach((job, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${job.position}</strong> @ ${job.company}<br>
      Deadline: ${job.deadline} • Status: ${job.status}
      <button onclick="deleteJob(${i})">🗑️</button>
    `;
    ul.appendChild(li);
  });
}

// 6) Delete
window.deleteJob = async i => {
  window.jobs.splice(i, 1);
  await saveJobsToDrive();
  renderJobs();
};

// 7) Add / Edit form
$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  if (!f.company.value || !f.position.value || !f.deadline.value) {
    return alert('Company, Position & Deadline are required.');
  }
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

// 8) Local “today” reminders
async function remindUpcoming() {
  if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    const today = new Date().toISOString().slice(0,10);
    window.jobs.forEach(job => {
      if (job.deadline === today) {
        new Notification('Job due today!', {
          body: `${job.position} @ ${job.company}`,
          icon: 'icons/icon-192.png'
        });
      }
    });
  }
}

// 9) Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('sw.js')
    .then(reg => console.log('SW registered at', reg.scope))
    .catch(err => console.error('SW registration failed:', err));
}
