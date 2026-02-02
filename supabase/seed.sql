-- Replace this UUID with a real auth.users id before running.
-- Example: select id from auth.users where email = 'you@example.com';
\set user_id '00000000-0000-0000-0000-000000000000'

insert into clients (user_id, name, status, priority, industry, health_score, today_signal, last_touched_at)
values
  (:'user_id', 'Acme Corp', 'active', 'high', 'Manufacturing', 82, 'Renewal in 2 weeks', now() - interval '2 days'),
  (:'user_id', 'Beacon Health', 'active', 'medium', 'Healthcare', 68, 'Onboarding kickoff', now() - interval '9 days'),
  (:'user_id', 'Cedar Finance', 'prospect', 'low', 'Fintech', 55, 'Discovery call scheduled', now() - interval '12 days');

insert into client_bullets (user_id, client_id, body)
select :'user_id', id, 'Key stakeholder change' from clients where name = 'Acme Corp';

insert into client_tasks (user_id, client_id, title, show_in_deck, due_date)
select :'user_id', id, 'Send Q3 roadmap', true, current_date + 3 from clients where name = 'Acme Corp';

insert into client_notes (user_id, client_id, body)
select :'user_id', id, 'Discuss renewal pricing on next call.' from clients where name = 'Beacon Health';

insert into client_bill_links (user_id, client_id, label, url)
select :'user_id', id, 'Invoice portal', 'https://example.com/invoices' from clients where name = 'Acme Corp';

insert into client_doc_links (user_id, client_id, label, url)
select :'user_id', id, 'SOW', 'https://example.com/docs/sow' from clients where name = 'Acme Corp';

insert into client_contacts (user_id, client_id, name, role, email, phone)
select :'user_id', id, 'Jordan Blake', 'VP Ops', 'jordan@example.com', '555-0101' from clients where name = 'Beacon Health';
