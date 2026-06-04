create table if not exists public.quickdot_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.quickdot_user_data enable row level security;

drop policy if exists "Users can read their own QuickDot data"
on public.quickdot_user_data;

create policy "Users can read their own QuickDot data"
on public.quickdot_user_data
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own QuickDot data"
on public.quickdot_user_data;

create policy "Users can create their own QuickDot data"
on public.quickdot_user_data
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own QuickDot data"
on public.quickdot_user_data;

create policy "Users can update their own QuickDot data"
on public.quickdot_user_data
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table if not exists public.quickdot_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  entry_date date,
  payload jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, entry_id)
);

create index if not exists quickdot_entries_user_updated_idx
on public.quickdot_entries (user_id, updated_at desc);

create index if not exists quickdot_entries_user_date_idx
on public.quickdot_entries (user_id, entry_date);

alter table public.quickdot_entries enable row level security;

drop policy if exists "Users can read their own QuickDot entries"
on public.quickdot_entries;

create policy "Users can read their own QuickDot entries"
on public.quickdot_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own QuickDot entries"
on public.quickdot_entries;

create policy "Users can create their own QuickDot entries"
on public.quickdot_entries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own QuickDot entries"
on public.quickdot_entries;

create policy "Users can update their own QuickDot entries"
on public.quickdot_entries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create table if not exists public.quickdot_entry_changes (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  action text not null check (action in ('upsert', 'delete')),
  changed_at timestamptz not null default now()
);

create index if not exists quickdot_entry_changes_user_changed_idx
on public.quickdot_entry_changes (user_id, changed_at desc);

alter table public.quickdot_entry_changes enable row level security;

drop policy if exists "Users can read their own QuickDot changes"
on public.quickdot_entry_changes;

create policy "Users can read their own QuickDot changes"
on public.quickdot_entry_changes
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own QuickDot changes"
on public.quickdot_entry_changes;

create policy "Users can create their own QuickDot changes"
on public.quickdot_entry_changes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create table if not exists public.quickdot_sync_errors (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quickdot_sync_errors_user_created_idx
on public.quickdot_sync_errors (user_id, created_at desc);

alter table public.quickdot_sync_errors enable row level security;

drop policy if exists "Users can read their own QuickDot sync errors"
on public.quickdot_sync_errors;

create policy "Users can read their own QuickDot sync errors"
on public.quickdot_sync_errors
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own QuickDot sync errors"
on public.quickdot_sync_errors;

create policy "Users can create their own QuickDot sync errors"
on public.quickdot_sync_errors
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create table if not exists public.quickdot_admins (
  email text primary key,
  created_at timestamptz not null default now()
);

insert into public.quickdot_admins (email)
values (lower('boyce3892846@gmail.com'))
on conflict (email) do nothing;

alter table public.quickdot_admins enable row level security;

create or replace function public.quickdot_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.quickdot_admins
    where email = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );
$$;

drop policy if exists "QuickDot admins can read admin list"
on public.quickdot_admins;

create policy "QuickDot admins can read admin list"
on public.quickdot_admins
for select
to authenticated
using (public.quickdot_is_admin());

create or replace function public.quickdot_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  result jsonb;
begin
  if not public.quickdot_is_admin() then
    raise exception 'QuickDot admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'totalUsers', (select count(*) from auth.users),
    'newUsersToday', (
      select count(*)
      from auth.users
      where created_at >= date_trunc('day', now())
    ),
    'activeUsers7d', (
      select count(distinct user_id)
      from public.quickdot_entry_changes
      where changed_at >= now() - interval '7 days'
    ),
    'totalEntries', (
      select count(*)
      from public.quickdot_entries
      where deleted_at is null
    ),
    'deletedEntries', (
      select count(*)
      from public.quickdot_entries
      where deleted_at is not null
    ),
    'changes24h', (
      select count(*)
      from public.quickdot_entry_changes
      where changed_at >= now() - interval '24 hours'
    ),
    'syncErrors24h', (
      select count(*)
      from public.quickdot_sync_errors
      where created_at >= now() - interval '24 hours'
    ),
    'syncErrors7d', (
      select count(*)
      from public.quickdot_sync_errors
      where created_at >= now() - interval '7 days'
    ),
    'latestEntryUpdate', (
      select max(updated_at)
      from public.quickdot_entries
    ),
    'latestSyncError', (
      select max(created_at)
      from public.quickdot_sync_errors
    )
  )
  into result;

  return result;
end;
$$;

create or replace function public.quickdot_admin_recent_sync_errors(limit_count integer default 25)
returns table (
  created_at timestamptz,
  email text,
  operation text,
  message text,
  details jsonb
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.quickdot_is_admin() then
    raise exception 'QuickDot admin access required' using errcode = '42501';
  end if;

  return query
  select
    errors.created_at,
    coalesce(users.email, 'unknown')::text as email,
    errors.operation,
    errors.message,
    errors.details
  from public.quickdot_sync_errors errors
  left join auth.users users on users.id = errors.user_id
  order by errors.created_at desc
  limit least(greatest(coalesce(limit_count, 25), 1), 100);
end;
$$;

grant execute on function public.quickdot_is_admin() to authenticated;
grant execute on function public.quickdot_admin_overview() to authenticated;
grant execute on function public.quickdot_admin_recent_sync_errors(integer) to authenticated;

notify pgrst, 'reload schema';
