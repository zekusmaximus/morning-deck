alter table daily_run_clients
  add column if not exists contact_made boolean not null default false;
