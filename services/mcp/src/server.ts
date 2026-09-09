import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { userClient } from './db.js';

function text(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] };
}

export function buildHomeServer(accessToken?: string) {
  const server = new McpServer(
    { name: 'lingqi-home', version: '0.1.0' },
    {
      capabilities: { tools: {} },
      instructions: 'Home 是用户自己的生活数据源。读取前优先调用 home_today 或 tasks_list。写入操作必须准确复述用户意图，不要自行创造任务、日记或事实。'
    }
  );

  server.registerTool(
    'home_today',
    {
      title: '查看 Home 今日概览',
      description: 'Use this when the user asks what they need to do today, what is unfinished, or for a quick Home overview.',
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async () => {
      const db = userClient(accessToken);
      const [{ data: tasks, error: taskError }, { data: notes, error: noteError }] = await Promise.all([
        db.from('tasks').select('id,title,category,due_at,status,created_at').order('created_at', { ascending: false }).limit(50),
        db.from('notes').select('id,content,created_at').order('created_at', { ascending: false }).limit(5)
      ]);
      if (taskError) throw taskError;
      if (noteError) throw noteError;
      return text({ tasks, recent_notes: notes });
    }
  );

  server.registerTool(
    'tasks_list',
    {
      title: '列出待办',
      description: 'Use this when the user wants to see, find, check, or reason about tasks stored in Home.',
      inputSchema: z.object({
        status: z.enum(['todo', 'done']).optional().describe('Optional task status filter')
      }),
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ status }) => {
      const db = userClient(accessToken);
      let query = db.from('tasks').select('id,title,category,due_at,status,created_at,updated_at').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return text(data);
    }
  );

  server.registerTool(
    'tasks_create',
    {
      title: '新建待办',
      description: 'Use this only when the user explicitly asks to add or remember a task in Home.',
      inputSchema: z.object({
        title: z.string().min(1).max(500),
        category: z.string().max(100).optional(),
        due_at: z.string().datetime({ offset: true }).optional().describe('ISO 8601 datetime with offset')
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async ({ title, category, due_at }) => {
      const db = userClient(accessToken);
      const { data, error } = await db
        .from('tasks')
        .insert({ title, category: category ?? null, due_at: due_at ?? null })
        .select('id,title,category,due_at,status,created_at')
        .single();
      if (error) throw error;
      return text(data);
    }
  );

  server.registerTool(
    'tasks_update',
    {
      title: '修改待办',
      description: 'Use this when the user explicitly asks to rename, recategorize, reschedule, complete, or reopen an existing Home task.',
      inputSchema: z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        category: z.string().max(100).nullable().optional(),
        due_at: z.string().datetime({ offset: true }).nullable().optional(),
        status: z.enum(['todo', 'done']).optional()
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ id, ...changes }) => {
      const patch = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
      if (Object.keys(patch).length === 0) return text({ id, unchanged: true });
      const db = userClient(accessToken);
      const { data, error } = await db
        .from('tasks')
        .update(patch)
        .eq('id', id)
        .select('id,title,category,due_at,status,created_at,updated_at')
        .single();
      if (error) throw error;
      return text(data);
    }
  );

  server.registerTool(
    'notes_list',
    {
      title: '读取随手记',
      description: 'Use this when the user asks to recall or review recent short notes saved in Home.',
      inputSchema: z.object({ limit: z.number().int().min(1).max(100).default(20) }),
      annotations: { readOnlyHint: true, openWorldHint: false }
    },
    async ({ limit }) => {
      const db = userClient(accessToken);
      const { data, error } = await db.from('notes').select('id,content,created_at,updated_at').order('created_at', { ascending: false }).limit(limit);
      if (error) throw error;
      return text(data);
    }
  );

  server.registerTool(
    'notes_create',
    {
      title: '保存随手记',
      description: 'Use this only when the user explicitly asks to save a short note, thought, or memo in Home.',
      inputSchema: z.object({ content: z.string().min(1).max(10000) }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false }
    },
    async ({ content }) => {
      const db = userClient(accessToken);
      const { data, error } = await db.from('notes').insert({ content }).select('id,content,created_at').single();
      if (error) throw error;
      return text(data);
    }
  );

  return server;
}
