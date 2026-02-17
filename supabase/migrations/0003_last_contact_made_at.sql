alter table clients
  add column if not exists last_contact_made_at timestamptz;
