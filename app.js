const STORAGE_KEY = 'home.shared-life.v1';
const SYNC_KEY = 'home.sync.v1';

const emptyState = () => ({
  schemaVersion: 1,
  revision: 0,
  updatedAt: new Date().toISOString(),
  tasks: [],
  notes: [],
  projects: [],
  dailyStates: []
});

let state = loadState();
let sync = loadSync();
let taskFilter = 'open';
let editorType = null;
let installPrompt = null;
let pushTimer = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const todayKey = () => new Date().toLocaleDateString('sv-SE');
const fmtDate = (value) => value ? new Intl.DateTimeFormat('zh-CN', { month:'short', day:'numeric' }).format(new Date(value)) : '';
const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function normalize(raw) {
  const base = emptyState();
  return {
    ...base,
    ...raw,
    tasks: Array.isArray(raw?.tasks) ? raw.tasks : [],
    notes: Array.isArray(raw?.notes) ? raw.notes : [],
    projects: Array.isArray(raw?.projects) ? raw.projects : [],
    dailyStates: Array.isArray(raw?.dailyStates) ? raw.dailyStates : []
  };
}

function loadState() {
  try { return normalize(JSON.parse(localStorage.getItem(STORAGE_KEY)) || emptyState()); }
  catch { return emptyState(); }
}
function loadSync() {
  try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || { apiUrl:'', token:'' }; }
  catch { return { apiUrl:'', token:'' }; }
}
function persist({ remote = true } = {}) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
  if (remote && sync.apiUrl && sync.token) schedulePush();
}
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushState(true), 700);
}
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}
function setSyncPill(text, kind='') {
  const el = $('#syncPill');
  el.textContent = text;
  el.dataset.kind = kind;
}

function render() {
  const now = new Date();
  $('#todayDate').textContent = new Intl.DateTimeFormat('zh-CN', { weekday:'long', month:'long', day:'numeric' }).format(now);
  const open = state.tasks.filter(t => !t.done);
  $('#todaySummary').textContent = open.length ? `还有 ${open.length} 件事在等我们。` : '今天的待办已经清空啦。';
  setSyncPill(sync.apiUrl && sync.token ? `已连接 · r${state.revision || 0}` : '仅本机');

  const todayTasks = open
    .filter(t => !t.due || t.due <= todayKey())
    .sort((a,b) => (a.due || '9999').localeCompare(b.due || '9999'))
    .slice(0,6);
  $('#todayTasks').innerHTML = todayTasks.length ? todayTasks.map(taskHTML).join('') : emptyHTML('今天没有压着你的事。');

  const notes = [...state.notes].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  $('#recentNotes').innerHTML = notes.length ? notes.slice(0,4).map(noteRowHTML).join('') : emptyHTML('还没记东西，想到什么就丢进来。');

  let tasks = [...state.tasks].sort((a,b) => Number(a.done)-Number(b.done) || (a.due || '9999').localeCompare(b.due || '9999'));
  if (taskFilter === 'open') tasks = tasks.filter(t => !t.done);
  if (taskFilter === 'done') tasks = tasks.filter(t => t.done);
  $('#taskList').innerHTML = tasks.length ? tasks.map(taskHTML).join('') : emptyHTML('这里暂时空空的。');

  $('#noteList').innerHTML = notes.length ? notes.map(noteCardHTML).join('') : emptyHTML('生活记录会慢慢长成一本小册子。');
  $('#projectList').innerHTML = state.projects.length ? state.projects.map(projectHTML).join('') : emptyHTML('还没有共同项目。');

  const daily = state.dailyStates.find(d => d.date === todayKey());
  $('#mood').value = daily?.mood ?? 3;
  $('#energy').value = daily?.energy ?? 3;
  $('#stateNote').value = daily?.note ?? '';

  $('#apiUrl').value = sync.apiUrl || '';
  $('#apiToken').value = sync.token || '';
}

function emptyHTML(text) { return `<div class="empty">${esc(text)}</div>`; }
function taskHTML(t) {
  const meta = [t.due ? `截止 ${fmtDate(t.due)}` : '', t.owner ? `· ${esc(t.owner)}` : ''].filter(Boolean).join(' ');
  return `<article class="item ${t.done?'done':''}">
    <button class="check" data-toggle-task="${esc(t.id)}" aria-label="切换完成">${t.done?'✓':''}</button>
    <div class="item-main"><div class="item-title">${esc(t.title)}</div>${meta?`<div class="item-meta">${meta}</div>`:''}</div>
    <button class="icon-btn" data-delete-task="${esc(t.id)}" aria-label="删除">×</button>
  </article>`;
}
function noteRowHTML(n) {
  return `<article class="item"><div class="item-main"><div class="item-title">${esc(n.title || '随手记')}</div><div class="item-meta">${esc(n.content).slice(0,80)} · ${fmtDate(n.createdAt)}</div></div></article>`;
}
function noteCardHTML(n) {
  return `<article class="note-card"><div class="item-meta">${fmtDate(n.createdAt)}${n.tag?` · ${esc(n.tag)}`:''}</div><h3>${esc(n.title || '随手记')}</h3><p>${esc(n.content)}</p><button class="text-btn" data-delete-note="${esc(n.id)}">删除</button></article>`;
}
function projectHTML(p) {
  const progress = Math.max(0, Math.min(100, Number(p.progress)||0));
  return `<article class="project-card"><div class="item-meta">${esc(p.status || '进行中')}</div><h3>${esc(p.name)}</h3><p class="muted">${esc(p.description || '')}</p><div class="project-progress"><span style="width:${progress}%"></span></div><div class="item-meta">${progress}%</div><button class="text-btn" data-delete-project="${esc(p.id)}">删除</button></article>`;
}

function navigate(name) {
  $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.nav === name));
  window.scrollTo({ top:0, behavior:'smooth' });
}

function openEditor(type) {
  editorType = type;
  const fields = $('#editorFields');
  if (type === 'task') {
    $('#editorTitle').textContent = '添加待办';
    fields.innerHTML = `<label>要做什么<input name="title" required maxlength="120" placeholder="比如：买猫砂" /></label><label>截止日期<input name="due" type="date" /></label><label>谁来做<input name="owner" maxlength="40" placeholder="玲 / 对方 / 一起" /></label>`;
  } else if (type === 'note') {
    $('#editorTitle').textContent = '记一下';
    fields.innerHTML = `<label>标题<input name="title" maxlength="80" placeholder="可不填" /></label><label>内容<textarea name="content" required maxlength="3000" placeholder="刚刚发生了什么、决定了什么、别忘了什么……"></textarea></label><label>标签<input name="tag" maxlength="40" placeholder="采购 / 家务 / 约定 / 随手记" /></label>`;
  } else {
    $('#editorTitle').textContent = '新建项目';
    fields.innerHTML = `<label>项目名<input name="name" required maxlength="100" placeholder="比如：搬家" /></label><label>说明<textarea name="description" maxlength="800" placeholder="我们要一起推进什么？"></textarea></label><label>状态<select name="status"><option>进行中</option><option>等待中</option><option>已完成</option></select></label><label>进度<input name="progress" type="number" min="0" max="100" value="0" /></label>`;
  }
  $('#editorDialog').showModal();
  fields.querySelector('input,textarea,select')?.focus();
}

function saveEditor() {
  const fd = new FormData($('#editorForm'));
  const now = new Date().toISOString();
  if (editorType === 'task') state.tasks.unshift({ id:uid(), title:fd.get('title').trim(), due:fd.get('due') || '', owner:fd.get('owner').trim(), done:false, createdAt:now });
  if (editorType === 'note') state.notes.unshift({ id:uid(), title:fd.get('title').trim(), content:fd.get('content').trim(), tag:fd.get('tag').trim(), createdAt:now });
  if (editorType === 'project') state.projects.unshift({ id:uid(), name:fd.get('name').trim(), description:fd.get('description').trim(), status:fd.get('status'), progress:Number(fd.get('progress')||0), createdAt:now });
  persist();
  toast('收好啦');
}

async function api(path='', options={}) {
  const base = (sync.apiUrl || '').replace(/\/$/, '');
  if (!base || !sync.token) throw new Error('还没有配置 API 地址和令牌');
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type':'application/json', 'authorization':`Bearer ${sync.token}`, ...(options.headers || {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function pullState() {
  $('#syncMessage').textContent = '正在从云端拉取…';
  try {
    const data = await api('/api/state');
    state = normalize(data.state || data);
    persist({ remote:false });
    $('#syncMessage').textContent = `已拉取 revision ${state.revision || 0}`;
    toast('云端数据已拉下来');
  } catch (e) { $('#syncMessage').textContent = `拉取失败：${e.message}`; }
}

async function pushState(silent=false) {
  if (!silent) $('#syncMessage').textContent = '正在推送…';
  try {
    const data = await api('/api/state', { method:'PUT', body:JSON.stringify({ state, ifRevision:Number(state.revision)||0 }) });
    state = normalize(data.state);
    persist({ remote:false });
    if (!silent) $('#syncMessage').textContent = `已推送 revision ${state.revision}`;
  } catch (e) {
    if (e.status === 409) {
      setSyncPill('云端有更新');
      $('#syncMessage').textContent = '云端已经被别处修改。先点“从云端拉取”，确认后再继续。';
      if (!silent) toast('发现同步冲突');
    } else {
      setSyncPill('同步失败');
      if (!silent) $('#syncMessage').textContent = `推送失败：${e.message}`;
    }
  }
}

$$('[data-nav]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.nav)));
$$('[data-open]').forEach(b => b.addEventListener('click', () => openEditor(b.dataset.open)));
$$('[data-task-filter]').forEach(b => b.addEventListener('click', () => {
  taskFilter = b.dataset.taskFilter;
  $$('[data-task-filter]').forEach(x => x.classList.toggle('active', x === b));
  render();
}));

document.addEventListener('click', e => {
  const toggle = e.target.closest('[data-toggle-task]');
  if (toggle) { const t = state.tasks.find(x => x.id === toggle.dataset.toggleTask); if (t) { t.done = !t.done; t.completedAt = t.done ? new Date().toISOString() : null; persist(); } }
  const dt = e.target.closest('[data-delete-task]');
  if (dt) { state.tasks = state.tasks.filter(x => x.id !== dt.dataset.deleteTask); persist(); }
  const dn = e.target.closest('[data-delete-note]');
  if (dn) { state.notes = state.notes.filter(x => x.id !== dn.dataset.deleteNote); persist(); }
  const dp = e.target.closest('[data-delete-project]');
  if (dp) { state.projects = state.projects.filter(x => x.id !== dp.dataset.deleteProject); persist(); }
});

$('#editorForm').addEventListener('submit', e => {
  if (e.submitter?.value === 'cancel') return;
  e.preventDefault();
  if (!e.currentTarget.reportValidity()) return;
  saveEditor();
  $('#editorDialog').close();
  e.currentTarget.reset();
});

$('#stateForm').addEventListener('submit', e => {
  e.preventDefault();
  const date = todayKey();
  const current = state.dailyStates.find(d => d.date === date);
  const next = { id:current?.id || uid(), date, mood:Number($('#mood').value), energy:Number($('#energy').value), note:$('#stateNote').value.trim(), updatedAt:new Date().toISOString() };
  state.dailyStates = [next, ...state.dailyStates.filter(d => d.date !== date)];
  persist(); toast('今天的状态记住了');
});

$('#saveSync').addEventListener('click', () => {
  sync = { apiUrl:$('#apiUrl').value.trim().replace(/\/$/,''), token:$('#apiToken').value.trim() };
  localStorage.setItem(SYNC_KEY, JSON.stringify(sync));
  render(); $('#syncMessage').textContent = sync.apiUrl && sync.token ? '连接信息已保存。建议先“从云端拉取”。' : '已切回仅本机模式。';
});
$('#pullSync').addEventListener('click', pullState);
$('#pushSync').addEventListener('click', () => pushState(false));

$('#exportData').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state,null,2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href:url, download:`home-backup-${todayKey()}.json` });
  a.click(); URL.revokeObjectURL(url);
});
$('#importData').addEventListener('change', async e => {
  const file = e.target.files?.[0]; if (!file) return;
  try { state = normalize(JSON.parse(await file.text())); persist({ remote:false }); toast('备份已导入'); }
  catch { toast('这个 JSON 看起来不对'); }
  e.target.value = '';
});

window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $('#installBtn').hidden = true; });

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
render();
