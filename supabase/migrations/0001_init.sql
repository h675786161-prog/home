create extension if not exists pgcrypto;

create type public.task_status as enum ('todo', 'done');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  category text,
  due_at timestamptz,
  status public.task_status not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  content text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

create trigger notes_set_updated_at before update on public.notes
for each row execute function public.set_updated_at();

create trigger journal_set_updated_at before update on public.journal_entries
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.journal_entries enable row level security;

create policy "tasks_select_own" on public.tasks for select using ((select auth.uid()) = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check ((select auth.uid()) = user_id);
create policy "tasks_update_own" on public.tasks for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "tasks_delete_own" on public.tasks for delete using ((select auth.uid()) = user_id);

create policy "notes_select_own" on public.notes for select using ((select auth.uid()) = user_id);
create policy "notes_insert_own" on public.notes for insert with check ((select auth.uid()) = user_id);
create policy "notes_update_own" on public.notes for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "notes_delete_own" on public.notes for delete using ((select auth.uid()) = user_id);

create policy "journal_select_own" on public.journal_entries for select using ((select auth.uid()) = user_id);
create policy "journal_insert_own" on public.journal_entries for insert with check ((select auth.uid()) = user_id);
create policy "journal_update_own" on public.journal_entries for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "journal_delete_own" on public.journal_entries for delete using ((select auth.uid()) = user_id);

create index tasks_user_status_idx on public.tasks(user_id, status, created_at desc);
create index notes_user_created_idx on public.notes(user_id, created_at desc);
