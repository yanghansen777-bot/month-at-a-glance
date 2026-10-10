const state = {
  date: new Date(2026, 9, 1),
  selected: new Date(2026, 9, 1),
  tasks: JSON.parse(localStorage.getItem('planly-tasks') || '{}')
};

const $ = (selector) => document.querySelector(selector);
const pad = (number) => String(number).padStart(2, '0');
const keyFor = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

function saveTasks(message = 'Saved just now · your plan is safe.') {
  localStorage.setItem('planly-tasks', JSON.stringify(state.tasks));
  const note = $('#saveNote');
  if (note) note.textContent = message;
}

function selectDate(value) {
  const selected = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(selected.getTime())) return;
  state.selected = selected;
  state.date = new Date(selected.getFullYear(), selected.getMonth(), 1);
  render();
}

function render() {
  $('#monthTitle').textContent = monthFormatter.format(state.date);
  $('#monthInput').value = monthFormatter.format(state.date);
  $('#selectedDate').textContent = dayFormatter.format(state.selected);
  $('#eventDate').value = keyFor(state.selected);

  const grid = $('#calendarGrid');
  grid.innerHTML = '';
  const first = new Date(state.date.getFullYear(), state.date.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const total = new Date(state.date.getFullYear(), state.date.getMonth() + 1, 0).getDate();

  for (let index = 0; index < 42; index += 1) {
    const number = index - offset + 1;
    const cellDate = new Date(state.date.getFullYear(), state.date.getMonth(), number);
    const cell = document.createElement('button');
    const count = (state.tasks[keyFor(cellDate)] || []).length;
    cell.type = 'button';
    cell.className = 'day';
    cell.textContent = cellDate.getDate();
    if (number < 1 || number > total) cell.classList.add('muted');
    if (keyFor(cellDate) === keyFor(state.selected)) cell.classList.add('selected');
    if (keyFor(cellDate) === '2026-10-06') cell.classList.add('today');
    if (count) {
      cell.classList.add('has-task');
      cell.dataset.busy = Math.min(count, 4);
    }
    cell.addEventListener('click', () => { selectDate(cellDate); $('#taskInput').focus(); });
    grid.appendChild(cell);
  }

  renderTasks();
}

function renderTasks() {
  const tasks = state.tasks[keyFor(state.selected)] || [];
  const list = $('#taskList');
  list.innerHTML = '';
  $('#taskCount').textContent = tasks.length;
  $('#emptyState').style.display = tasks.length ? 'none' : 'block';

  tasks.forEach((task, index) => {
    const item = document.createElement('li');
    item.className = `task-item${task.done ? ' done' : ''}${task.hidden ? ' hidden-event' : ''}`;
    item.innerHTML = `<span class="task-text"></span><button class="finish-task" type="button">${task.done ? 'Finished' : 'Finish'}</button><button class="hide-task" type="button">${task.hidden ? 'Show' : 'Hide'}</button><button class="delete-task" type="button" aria-label="Delete event">×</button>`;
    item.querySelector('.task-text').textContent = task.text;
    item.querySelector('.finish-task').addEventListener('click', () => {
      task.done = !task.done;
      saveTasks(task.done ? 'Finished · your plan is safe.' : 'Marked as active.');
      renderTasks();
    });
    item.querySelector('.hide-task').addEventListener('click', () => {
      task.hidden = !task.hidden;
      saveTasks(task.hidden ? 'Event hidden · it is still saved.' : 'Event shown again.');
      renderTasks();
    });
    item.querySelector('.delete-task').addEventListener('click', () => {
      tasks.splice(index, 1);
      saveTasks('Event deleted.');
      render();
    });
    list.appendChild(item);
  });
}

function changeMonth(amount) {
  state.date = new Date(state.date.getFullYear(), state.date.getMonth() + amount, 1);
  state.selected = new Date(state.date);
  render();
}

function generatePlan() {
  const year = state.date.getFullYear();
  const month = state.date.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const ideas = ['Set your priorities', 'Make time for yourself', 'Work on one important thing', 'Check in with someone you care about', 'Tidy one small space', 'Look back at what you finished'];
  ideas.forEach((text, index) => {
    const day = Math.min(1 + index * Math.max(1, Math.floor(days / ideas.length)), days);
    const key = keyFor(new Date(year, month, day));
    state.tasks[key] ||= [];
    if (!state.tasks[key].some((task) => task.text === text)) state.tasks[key].push({ text, done: false, hidden: false });
  });
  saveTasks('A starter plan was added to your month.');
  render();
}

$('#prevMonth').addEventListener('click', () => changeMonth(-1));
$('#nextMonth').addEventListener('click', () => changeMonth(1));
$('#eventDate').addEventListener('change', (event) => selectDate(event.target.value));
$('#taskForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const text = $('#taskInput').value.trim();
  const date = $('#eventDate').value;
  if (!text || !date) return;
  selectDate(date);
  const key = keyFor(state.selected);
  state.tasks[key] ||= [];
  state.tasks[key].push({ text, done: false, hidden: false });
  $('#taskInput').value = '';
  saveTasks();
  render();
  $('#taskInput').focus();
});
$('#monthInput').addEventListener('change', (event) => {
  const parsed = new Date(`${event.target.value} 1`);
  if (!Number.isNaN(parsed.getTime())) selectDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  else event.target.value = monthFormatter.format(state.date);
});
$('#todayButton').addEventListener('click', () => { state.date = new Date(2026, 9, 1); state.selected = new Date(2026, 9, 6); render(); $('.planner-shell').scrollIntoView({ behavior: 'smooth' }); });

const generateButton = document.createElement('button');
generateButton.className = 'generate-button';
generateButton.type = 'button';
generateButton.textContent = 'Generate a plan';
generateButton.addEventListener('click', generatePlan);
$('.task-heading').appendChild(generateButton);

const shareButton = document.createElement('button');
shareButton.className = 'share-button';
shareButton.type = 'button';
shareButton.innerHTML = 'Share calendar <span>↗</span>';
shareButton.addEventListener('click', async () => {
  const encoded = btoa(encodeURIComponent(JSON.stringify(state.tasks)));
  const url = `${location.origin}${location.pathname}#plan=${encoded}`;
  try { await navigator.clipboard.writeText(url); shareButton.textContent = 'Link copied ✓'; }
  catch { window.prompt('Copy this calendar link:', url); }
  setTimeout(() => { shareButton.innerHTML = 'Share calendar <span>↗</span>'; }, 1800);
});
$('.planner-head').appendChild(shareButton);

if (location.hash.startsWith('#plan=')) {
  try {
    state.tasks = JSON.parse(decodeURIComponent(atob(location.hash.slice(6))));
    saveTasks('Shared calendar loaded.');
  } catch (error) { console.warn('Could not read shared plan', error); }
}

render();
