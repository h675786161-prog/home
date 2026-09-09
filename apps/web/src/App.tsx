import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { createNote, createTask, listNotes, listTasks, setTaskDone } from './lib/homeRepository';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import type { Note, Task } from './lib/types';

function formatDate() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(new Date());
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [taskDraft, setTaskDraft] = useState('');
  const [noteDraft, setNoteDraft] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(!hasSupabaseConfig);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [nextTasks, nextNotes] = await Promise.all([listTasks(), listNotes()]);
      setTasks(nextTasks);
      setNotes(nextNotes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '读取数据失败');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      void refresh();
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      const ok = Boolean(data.session);
      setSignedIn(ok);
      if (ok) void refresh();
      else setBusy(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const ok = Boolean(session);
      setSignedIn(ok);
      if (ok) void refresh();
    });

    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const doneCount = useMemo(() => tasks.filter((task) => task.status === 'done').length, [tasks]);

  async function submitTask(event: FormEvent) {
    event.preventDefault();
    const title = taskDraft.trim();
    if (!title) return;
    setTaskDraft('');
    try {
      await createTask(title);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '添加任务失败');
    }
  }

  async function submitNote(event: FormEvent) {
    event.preventDefault();
    const content = noteDraft.trim();
    if (!content) return;
    setNoteDraft('');
    try {
      await createNote(content);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存随手记失败');
    }
  }

  async function toggleTask(task: Task) {
    await setTaskDone(task.id, task.status !== 'done');
    await refresh();
  }

  if (hasSupabaseConfig && !signedIn) return <Login />;

  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">HOME · 玲 × 七</p>
          <h1>早上好，回家啦。</h1>
          <p className="date">{formatDate()}</p>
        </div>
        <div className="orb" aria-hidden="true">✦</div>
      </header>

      <section className="status-grid">
        <article className="glass stat-card"><span>今日待办</span><strong>{tasks.length}</strong><small>完成 {doneCount} 项</small></article>
        <article className="glass stat-card"><span>随手记</span><strong>{notes.length}</strong><small>最近留下的小纸条</small></article>
        <article className="glass stat-card mode-card"><span>当前模式</span><strong>{hasSupabaseConfig ? '云端' : 'Demo'}</strong><small>{hasSupabaseConfig ? 'Supabase 已连接' : '只存在这台设备'}</small></article>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <section className="content-grid">
        <article className="glass panel">
          <div className="panel-heading">
            <div><p className="eyebrow">TODAY</p><h2>今天要做什么</h2></div>
            <span className="pill">{busy ? '读取中' : `${doneCount}/${tasks.length}`}</span>
          </div>

          <form className="quick-form" onSubmit={submitTask}>
            <input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} placeholder="丢一件事情进来…" aria-label="新待办" />
            <button type="submit">加入</button>
          </form>

          <div className="task-list">
            {tasks.map((task) => (
              <button key={task.id} className={`task ${task.status}`} onClick={() => void toggleTask(task)}>
                <span className="check">{task.status === 'done' ? '✓' : ''}</span>
                <span className="task-copy"><span>{task.title}</span><small>{task.category ?? '未分类'}</small></span>
              </button>
            ))}
            {!busy && tasks.length === 0 && <p className="empty">今天的篮子还是空的。</p>}
          </div>
        </article>

        <article className="glass panel notes-panel">
          <div className="panel-heading"><div><p className="eyebrow">POCKET</p><h2>随手记</h2></div></div>
          <form className="note-form" onSubmit={submitNote}>
            <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="想到什么先塞这里，别让它跑掉。" rows={4} />
            <button type="submit">收好</button>
          </form>
          <div className="notes-list">
            {notes.slice(0, 5).map((note) => (
              <div className="note" key={note.id}>
                <p>{note.content}</p>
                <time>{new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(note.created_at))}</time>
              </div>
            ))}
            {notes.length === 0 && <p className="empty">口袋现在空空的。</p>}
          </div>
        </article>
      </section>

      <footer>
        <span>Home v0.1</span>
        {supabase && <button className="link-button" onClick={() => void supabase.auth.signOut()}>退出登录</button>}
      </footer>
    </main>
  );
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function auth(mode: 'login' | 'signup') {
    if (!supabase) return;
    setMessage('处理中…');
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setMessage(result.error ? result.error.message : mode === 'signup' ? '注册完成，请按项目设置完成邮箱验证。' : '欢迎回来。');
  }

  return (
    <main className="login-shell">
      <section className="glass login-card">
        <div className="orb login-orb">✦</div>
        <p className="eyebrow">HOME · PRIVATE DOOR</p>
        <h1>先敲一下门。</h1>
        <p className="muted">连接 Supabase 后，Home 会使用你的账户保护真实生活数据。</p>
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="邮箱" type="email" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="密码" type="password" />
        <div className="login-actions">
          <button onClick={() => void auth('login')}>登录</button>
          <button className="secondary" onClick={() => void auth('signup')}>第一次来</button>
        </div>
        {message && <p className="auth-message">{message}</p>}
      </section>
    </main>
  );
}
