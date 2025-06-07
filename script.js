// 1) Your Google OAuth Client ID (from Cloud Console)
const CLIENT_ID = '1008402588740-4pcktur9ascnaqobn81d91p0sk3ddt06.apps.googleusercontent.com';

// 2) The filename we'll store in your Drive AppData folder
const DRIVE_FILE_NAME = 'jobs.json';

// UI helpers
const $ = id => document.getElementById(id);
const show = el => el.classList.remove('hidden');
const hide = el => el.classList.add('hidden');

// Initialize the Google API client & Auth
function initGapi() {
  gapi.load('client:auth2', async () => {
    await gapi.client.init({
      clientId: CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/drive.appdata'
    });
    attachSignin($('btn-google-signin'), gapi.auth2.getAuthInstance());
  });
}

// Wire the Sign-in button
function attachSignin(btn, authInstance) {
  btn.onclick = async () => {
    try {
      await authInstance.signIn();
      hide($('auth'));
      show($('app'));
      await loadJobsFromDrive();
    } catch (e) {
      console.error('Google sign-in error:', e);
      alert('Sign-in failed. Check console for details.');
    }
  };
}

// Load jobs.json from Drive AppDataFolder
async function loadJobsFromDrive() {
  try {
    // List files named jobs.json in appDataFolder
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
      // No existing file
      window.jobs = [];
    }
  } catch (e) {
    console.error('Error loading jobs from Drive:', e);
    window.jobs = [];
  }
  renderJobs();
}

// Save the in-memory jobs[] back to Drive (create or update)
async function saveJobsToDrive() {
  const metadata = {
    name: DRIVE_FILE_NAME,
    parents: ['appDataFolder']
  };
  const media = {
    mimeType: 'application/json',
    body: JSON.stringify({ jobs: window.jobs }, null, 2)
  };

  // See if file already exists
  const listResp = await gapi.client.drive.files.list({
    spaces: 'appDataFolder',
    q: `name='${DRIVE_FILE_NAME}'`
  });

  if (listResp.result.files.length) {
    // Update it
    const fileId = listResp.result.files[0].id;
    await gapi.client.drive.files.update({
      fileId,
      resource: metadata,
      media
    });
  } else {
    // Create it
    await gapi.client.drive.files.create({
      resource: metadata,
      media,
      fields: 'id'
    });
  }
}

// Render the list of jobs into the UI
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

// Delete a job by index
window.deleteJob = async i => {
  window.jobs.splice(i,1);
  await saveJobsToDrive();
  renderJobs();
};

// Handle form submission
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

// Kick it all off
initGapi();
