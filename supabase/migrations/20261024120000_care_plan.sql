-- Care plan: medicine reminders, follow-up visits and repeat tests per family member.
--
-- Items are created by the copilot agent from the person's own records (source = 'agent')
-- or added by the user (source = 'user'). Agent items start unreviewed so the user can
-- keep, edit or remove what the agent did. A removed agent item stays as 'dismissed' so
-- the agent never re-creates it.

create table public.care_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  record_id uuid references public.health_records (id) on delete set null,
  kind text not null check (kind in ('medicine', 'appointment', 'repeat_test')),
  title text not null,                       -- medicine name, visit name, or the tests
  detail text,                               -- dose for medicines, place for visits
  meta jsonb not null default '{}'::jsonb,   -- timing note, tests[], frequency text, reason codes
  schedule text check (schedule in ('daily', 'weekly', 'as_needed', 'once')),
  times text[] not null default '{}',        -- local HH:MM dose times
  weekday smallint check (weekday between 0 and 6),  -- for weekly medicines, Monday = 0
  start_date date,
  end_date date,                             -- course end; null = ongoing
  due_date date,                             -- visits and repeat tests
  status text not null default 'active' check (status in ('active', 'paused', 'done', 'dismissed')),
  source text not null default 'agent' check (source in ('agent', 'user')),
  reviewed boolean not null default false,   -- user has seen and kept an agent item
  dedupe_key text,                           -- stable key so the agent is idempotent
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_items_patient_idx on public.care_items (patient_id, status);
create index care_items_owner_idx on public.care_items (owner_id);
create unique index care_items_dedupe_idx on public.care_items (owner_id, patient_id, dedupe_key) where dedupe_key is not null;

-- What the person did with each dose or item: taken, skipped, snoozed, done.
create table public.care_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid not null references public.care_items (id) on delete cascade,
  action text not null check (action in ('taken', 'skipped', 'snoozed', 'done', 'reopened')),
  dose_date date,
  dose_time text,
  snooze_until timestamptz,
  at timestamptz not null default now()
);
create index care_log_item_idx on public.care_log (item_id, dose_date);
create index care_log_owner_idx on public.care_log (owner_id);

do $$
declare t text;
begin
  foreach t in array array['care_items', 'care_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%1$s owner read" on public.%1$I for select to authenticated using (owner_id = (select auth.uid()))', t);
    execute format('create policy "%1$s owner write" on public.%1$I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
  end loop;
end $$;
