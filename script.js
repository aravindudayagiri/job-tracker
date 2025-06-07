// Ask for notifications
if ('Notification' in window) Notification.requestPermission();

// Helpers for storage
const KEY = 'jobs';
const load = () => JSON.parse(localStorage.getItem(KEY) || '[]');
const save = arr => localStorage.setItem(KEY, JSON.stringify(arr));

// Progress bar logic
const prog = document.getElementById('form-progress');
['company','position','deadline'].forEach(id =>
  document.getElementById(id).addEventListener('input', () => {
    const filled = ['company','position','deadline']
      .filter(f => document.getElementById(f).value).length;
    prog.value = (filled/3)*100;
  })
);

// Render all jobs
function render() {
  const ul = document.getElementById('jobs');
  ul.innerHTML = '';
  load().forEach((job,i) => {
    const li = document.createElement('li');
    li.className = 'job-item';
    li.dataset.priority = job.priority;
    // History list
    const hist = (job.history||[])
      .map(h=>`<li>${h.date}: ${h.status}</li>`).join('');
    li.innerHTML = `
      <h3>${job.position} @ ${job.company}</h3>
      <p><strong>Deadline:</strong> ${job.deadline}</p>
      <p><strong>Status:</strong> ${job.status}</p>
      ${hist?`<div class="history"><ul>${hist}</ul></div>`:''}
      <div class="actions">
        <button onclick="del(${i})">🗑️</button>
      </div>`;
    ul.appendChild(li);
  });
}

// Form submit handler
document.getElementById('job-form').onsubmit = e => {
  e.preventDefault();
  const f = e.target;
  const today = new Date().toISOString().slice(0,10);
  const arr = load();
  const job = {
    company:  f.company.value,
    position: f.position.value,
    deadline: f.deadline.value,
    link:     f.link.value,
    priority: f.priority.value,
    status:   f.status.value,
    notes:    f.notes.value,
    history:  [{status:f.status.value, date:today}]
  };
  arr.push(job);
  save(arr);
  render();
  f.reset();
  prog.value = 0;
  // Schedule notification
  const ms = new Date(job.deadline).getTime() - Date.now();
  if (ms>0) setTimeout(()=>{
    new Notification('Reminder',
      { body:`Apply for ${job.position} @ ${job.company} by ${job.deadline}` }
    );
  }, ms);
};

// Delete function
window.del = i => {
  const arr = load(); arr.splice(i,1);
  save(arr); render();
};

// Initialize
window.onload = render;
