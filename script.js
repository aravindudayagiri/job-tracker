// Notification permission
if ('Notification' in window) Notification.requestPermission();

// Helpers
const KEY = 'jobs';
const load = () => JSON.parse(localStorage.getItem(KEY)||'[]');
const save = arr => localStorage.setItem(KEY, JSON.stringify(arr));

// Progress bar update
const prog = document.getElementById('form-progress');
['company','position','deadline'].forEach(id=>
  document.getElementById(id).addEventListener('input', ()=>{
    const filled = ['company','position','deadline']
      .filter(f=>document.getElementById(f).value).length;
    prog.value = (filled/3)*100;
  })
);

// Render jobs
function render(){
  const ul = document.getElementById('jobs');
  ul.innerHTML = '';
  load().forEach((job,i)=>{
    const li = document.createElement('li');
    li.className='job-item';
    li.dataset.priority=job.priority;
    // history HTML
    const hist = job.history?.map(h=>
      `<li>${h.date}: ${h.status}</li>`
    ).join('');
    li.innerHTML=`
      <h3>${job.position}@${job.company}</h3>
      <p>Deadline:${job.deadline}</p>
      <p>Status:${job.status}</p>
      ${hist?`<div class="history"><ul>${hist}</ul></div>`:''}
      <div class="actions">
        <button onclick="del(${i})">🗑️</button>
      </div>`;
    ul.appendChild(li);
  });
}

// Form submit
document.getElementById('job-form').onsubmit = e=>{
  e.preventDefault();
  const f=e.target, arr=load(), today=new Date().toISOString().slice(0,10);
  const data={company:f.company.value,
              position:f.position.value,
              deadline:f.deadline.value,
              link:f.link.value,
              priority:f.priority.value,
              status:f.status.value,
              notes:f.notes.value,
              history:[{status:f.status.value,date:today}]};
  arr.push(data);
  save(arr);
  render();
  f.reset(); prog.value=0;
  // schedule reminder
  const ms=new Date(data.deadline).getTime()-Date.now();
  if(ms>0) setTimeout(()=>{
    new Notification('Reminder', {
      body:`Apply ${data.position}@${data.company} by ${data.deadline}`
    });
  },ms);
};

// Delete
function del(i){ const a=load(); a.splice(i,1); save(a); render(); }

// Init
window.onload=render;
