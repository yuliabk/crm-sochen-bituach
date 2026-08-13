-- Synthetic test data for local/dev QA.
--
-- clients/policies/tasks are scoped to a single agent (agent_id, RLS), so
-- this script needs a real agents.id to attach the seed rows to. Sign up an
-- agent through /login first, then find their id in Supabase
-- (Table Editor -> agents, or `select id from agents;`), and run:
--
--   psql "$DATABASE_URL" -v agent_id="'<the-agent-uuid>'" -f supabase/seed.sql
--
-- (the extra single quotes around the uuid are required by psql's -v)

-- לקוחות דמה (כולל לקוחות כשרים המועברים ל-SMS בלבד)
insert into clients (id, agent_id, id_number, full_name, phone, email, birth_date, preferred_channel, status) values
('a1111111-1111-1111-1111-111111111111', :agent_id, '012345678', 'ישראל ישראלי', '0501234567', 'israel@example.com', '1985-04-12', 'auto', 'active'),
('b2222222-2222-2222-2222-222222222222', :agent_id, '023456789', 'מיכל כהן', '0522345678', 'michal@example.com', '1990-09-25', 'auto', 'active'),
('c3333333-3333-3333-3333-333333333333', :agent_id, '034567890', 'משה לוי', '0543456789', 'moshe@example.com', '1978-11-05', 'sms_only', 'active'), -- טלפון כשר / סמס בלבד
('d4444444-4444-4444-4444-444444444444', :agent_id, '045678901', 'רחל אברהם', '0534567890', 'rachel@example.com', '1995-01-15', 'auto', 'active'),
('e5555555-5555-5555-5555-555555555555', :agent_id, '056789012', 'דוד פרידמן', '0585678901', 'david@example.com', '1982-07-30', 'sms_only', 'active');

-- פוליסות דמה עם תאריכי חידוש קרובים
insert into policies (agent_id, client_id, policy_number, company, insurance_type, start_date, renewal_date, monthly_premium, status) values
(:agent_id, 'a1111111-1111-1111-1111-111111111111', 'POL-1001', 'הפניקס', 'רכב מקיף', '2025-09-01', current_date + interval '15 days', 350.00, 'active'),
(:agent_id, 'a1111111-1111-1111-1111-111111111111', 'POL-1002', 'הראל', 'מבנה וכולל דירה', '2025-10-15', current_date + interval '45 days', 180.00, 'active'),
(:agent_id, 'b2222222-2222-2222-2222-222222222222', 'POL-2001', 'מגדל', 'בריאות מורחב', '2025-08-20', current_date + interval '5 days', 240.00, 'active'),
(:agent_id, 'c3333333-3333-3333-3333-333333333333', 'POL-3001', 'כלל', 'ביטוח חיים', '2025-09-10', current_date + interval '25 days', 120.00, 'active'),
(:agent_id, 'd4444444-4444-4444-4444-444444444444', 'POL-4001', 'מנורה', 'רכב חובה', '2025-08-28', current_date + interval '12 days', 210.00, 'active');

-- משימות דמה
insert into tasks (agent_id, client_id, task_type, due_date, priority, status, description) values
(:agent_id, 'a1111111-1111-1111-1111-111111111111', 'חידוש פוליסה', current_date + interval '15 days', 'high', 'open', 'לשלוח הצעת חידוש ביטוח רכב הפניקס'),
(:agent_id, 'c3333333-3333-3333-3333-333333333333', 'חידוש פוליסה', current_date + interval '25 days', 'high', 'open', 'שליחת תזכורת ב-SMS לביטוח חיים כלל');
