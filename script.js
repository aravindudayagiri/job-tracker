// Replace with your credentials:
const CLIENT_ID = '619964747740-6mojj8ssbiancbbvs8671asctme0r41f.apps.googleusercontent.com';
const API_KEY   = 'AIzaSyAp1S8zTpiR6qOWk1rYVmnX59wmFKau6S8';
const DRIVE_FILE = 'jobs.json';

// DOM helpers
const $ = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// Expose for Google API loader
window.initGapi = async function() {
  await gapi.load('client:auth2', async () => {
    await gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      scope: 'https://www.googleapis.com/auth/drive.appdata'
    });
    // Wire up sign-in button
    $('btn-signin').onclick = onSignIn;
  });
};

// Handle sign-in
async function onSignIn() {
  try {
    await gapi.auth2.getAuthInstance().signIn();
    hide($('auth'));
    show($('app'));
    await loadJobs();
    notifyOnLoad();
  } catch (e) {
    console.error(e);
    alert('Sign-in failed; check console.');
  }
}

// Load jobs.json from Drive AppData
async function loadJobs() {
  try {
    const listRes = await gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: `name='${DRIVE_FILE}'`
    });
    if (listRes.result.files.length) {
      const fileId = listRes.result.files[0].id;
      const getRes = await gapi.client.drive.files.get({
        fileId,
        alt: 'media'
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

// Save jobs back to Drive
async function saveJobs() {
  const metadata = { name: DRIVE_FILE, parents: ['appDataFolder'] };
  const media = {
    mimeType: 'application/json',
    body: JSON.stringify({ jobs: window.jobs }, null, 2)
  };
  const listRes = await gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${DRIVE_FILE}'`
  });
  if (listRes.result.files.length) {
    // Update existing
    await gapi.client.drive.files.update({
      fileId: listRes.result.files[0].id,
      resource: metadata,
      media
    });
  } else {
    // Create new
    await gapi.client.drive.files.create({
      resource: metadata,
      media
    });
  }
}

// Render the job list
function renderJobs() {
  const ul = $('jobs');
  ul.innerHTML = '';
  (window.jobs || []).forEach((job, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${job.company}</strong> — ${job.position}<br>
      Due: ${job.deadline} • Priority: ${job.priority}
    `;
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.onclick = async () => {
      window.jobs.splice(i, 1);
      await saveJobs();
      renderJobs();
    };
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

// Handle form submission
$('job-form').onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  window.jobs.push({
    company:  f.company.value,
    position: f.position.value,
    deadline: f.deadline.value,
    priority: f.priority.value
  });
  await saveJobs();
  renderJobs();
  f.reset();
};

// Notify on load for due jobs
async function notifyOnLoad() {
  if (Notification.permission !== 'granted') {
    await Notification.requestPermission();
  }
  if (Notification.permission === 'granted') {
    const today = new Date().toISOString().slice(0,10);
    window.jobs.forEach(job => {
      // High=0 days ahead, Medium=1, Low=2
      const lead = job.priority === 'High'?0:(job.priority==='Medium'?1:2);
      const remindDate = new Date(job.deadline);
      remindDate.setDate(remindDate.getDate() - lead);
      if (remindDate.toISOString().slice(0,10) === today) {
        new Notification('Job Reminder', {
          body: `${job.position} @ ${job.company}`
        });
      }
    });
  }
}
