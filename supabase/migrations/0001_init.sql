create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'prospect')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  industry text,
  health_score integer,
  today_signal text,
  last_touched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_bullets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists client_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  title text not null,
  is_complete boolean not null default false,
  show_in_deck boolean not null default false,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists client_bill_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists client_doc_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists client_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  name text not null,
  role text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists daily_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, run_date)
);

create table if not exists daily_run_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_run_id uuid not null references daily_runs(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  ordinal_index integer not null,
  outcome text check (outcome in ('reviewed', 'flagged')),
  reviewed_at timestamptz,
  quick_note text,
  created_at timestamptz not null default now(),
  unique (daily_run_id, client_id),
  unique (daily_run_id, ordinal_index)
);

create table if not exists daily_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_date date not null,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, run_date)
);

create or replace function enforce_client_bullet_cap()
returns trigger as $$
begin
  if (select count(*) from client_bullets where client_id = new.client_id) >= 5 then
    raise exception 'client bullet cap reached (max 5)';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger client_bullet_cap
before insert on client_bullets
for each row execute function enforce_client_bullet_cap();

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_set_updated_at
before update on clients
for each row execute function set_updated_at();

create trigger client_tasks_set_updated_at
before update on client_tasks
for each row execute function set_updated_at();

alter table clients enable row level security;
alter table client_bullets enable row level security;
alter table client_tasks enable row level security;
alter table client_notes enable row level security;
alter table client_bill_links enable row level security;
alter table client_doc_links enable row level security;
alter table client_contacts enable row level security;
alter table daily_runs enable row level security;
alter table daily_run_clients enable row level security;
alter table daily_focus enable row level security;

create policy "Clients are scoped to user" on clients
  for select using (user_id = auth.uid());
create policy "Clients insert" on clients
  for insert with check (user_id = auth.uid());
create policy "Clients update" on clients
  for update using (user_id = auth.uid());
create policy "Clients delete" on clients
  for delete using (user_id = auth.uid());

create policy "Client bullets scoped" on client_bullets
  for select using (user_id = auth.uid());
create policy "Client bullets insert" on client_bullets
  for insert with check (user_id = auth.uid());
create policy "Client bullets update" on client_bullets
  for update using (user_id = auth.uid());
create policy "Client bullets delete" on client_bullets
  for delete using (user_id = auth.uid());

create policy "Client tasks scoped" on client_tasks
  for select using (user_id = auth.uid());
create policy "Client tasks insert" on client_tasks
  for insert with check (user_id = auth.uid());
create policy "Client tasks update" on client_tasks
  for update using (user_id = auth.uid());
create policy "Client tasks delete" on client_tasks
  for delete using (user_id = auth.uid());

create policy "Client notes scoped" on client_notes
  for select using (user_id = auth.uid());
create policy "Client notes insert" on client_notes
  for insert with check (user_id = auth.uid());
create policy "Client notes update" on client_notes
  for update using (user_id = auth.uid());
create policy "Client notes delete" on client_notes
  for delete using (user_id = auth.uid());

create policy "Client bill links scoped" on client_bill_links
  for select using (user_id = auth.uid());
create policy "Client bill links insert" on client_bill_links
  for insert with check (user_id = auth.uid());
create policy "Client bill links update" on client_bill_links
  for update using (user_id = auth.uid());
create policy "Client bill links delete" on client_bill_links
  for delete using (user_id = auth.uid());

create policy "Client doc links scoped" on client_doc_links
  for select using (user_id = auth.uid());
create policy "Client doc links insert" on client_doc_links
  for insert with check (user_id = auth.uid());
create policy "Client doc links update" on client_doc_links
  for update using (user_id = auth.uid());
create policy "Client doc links delete" on client_doc_links
  for delete using (user_id = auth.uid());

create policy "Client contacts scoped" on client_contacts
  for select using (user_id = auth.uid());
create policy "Client contacts insert" on client_contacts
  for insert with check (user_id = auth.uid());
create policy "Client contacts update" on client_contacts
  for update using (user_id = auth.uid());
create policy "Client contacts delete" on client_contacts
  for delete using (user_id = auth.uid());

create policy "Daily runs scoped" on daily_runs
  for select using (user_id = auth.uid());
create policy "Daily runs insert" on daily_runs
  for insert with check (user_id = auth.uid());
create policy "Daily runs update" on daily_runs
  for update using (user_id = auth.uid());
create policy "Daily runs delete" on daily_runs
  for delete using (user_id = auth.uid());

create policy "Daily run clients scoped" on daily_run_clients
  for select using (user_id = auth.uid());
create policy "Daily run clients insert" on daily_run_clients
  for insert with check (user_id = auth.uid());
create policy "Daily run clients update" on daily_run_clients
  for update using (user_id = auth.uid());
create policy "Daily run clients delete" on daily_run_clients
  for delete using (user_id = auth.uid());

create policy "Daily focus scoped" on daily_focus
  for select using (user_id = auth.uid());
create policy "Daily focus insert" on daily_focus
  for insert with check (user_id = auth.uid());
create policy "Daily focus update" on daily_focus
  for update using (user_id = auth.uid());
create policy "Daily focus delete" on daily_focus
  for delete using (user_id = auth.uid());
