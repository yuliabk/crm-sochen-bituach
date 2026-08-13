-- CRM for insurance agents: core schema + Row-Level Security
-- Table/column names follow the project's dev-instructions doc (schema.sql
-- section) so that doc's seed.sql / Python import scripts work unmodified.
-- Multi-tenancy (agent_id + RLS) is layered on top so the same schema can
-- later support more than one agent, not just the single MVP user.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- agents: one row per authenticated agent/user (maps 1:1 to auth.users)
-- ---------------------------------------------------------------------------
create table if not exists agents (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  agency_name text,
  created_at timestamptz not null default now()
);

alter table agents enable row level security;

create policy "agents_select_own" on agents
  for select using (id = auth.uid());
create policy "agents_update_own" on agents
  for update using (id = auth.uid());

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  id_number varchar(20) not null,
  full_name varchar(100) not null,
  phone varchar(20) not null,
  email varchar(100),
  birth_date date,
  preferred_channel varchar(20) not null default 'auto'
    check (preferred_channel in ('auto', 'whatsapp_only', 'sms_only')),
  status varchar(20) not null default 'active'
    check (status in ('active', 'inactive', 'lead')),
  notes text,
  -- unique per agent, not globally: the same id_number may legitimately
  -- belong to different agents' client books.
  unique (agent_id, id_number)
);

create index if not exists idx_clients_agent_id on clients (agent_id);
create index if not exists idx_clients_phone on clients (phone);

alter table clients enable row level security;

create policy "clients_select_own" on clients
  for select using (agent_id = auth.uid());
create policy "clients_insert_own" on clients
  for insert with check (agent_id = auth.uid());
create policy "clients_update_own" on clients
  for update using (agent_id = auth.uid());
create policy "clients_delete_own" on clients
  for delete using (agent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- policies (insurance policies)
-- ---------------------------------------------------------------------------
create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid references clients (id) on delete cascade,
  policy_number varchar(50) not null,
  company varchar(50) not null, -- הפניקס, הראל, מגדל, כלל, מנורה, אלטשולר...
  insurance_type varchar(50) not null, -- רכב, דירה, בריאות, חיים, פנסיה, מנהלים...
  start_date date not null,
  renewal_date date not null,
  monthly_premium decimal(10, 2),
  status varchar(20) not null default 'active'
    check (status in ('active', 'expired', 'cancelled', 'pending_renewal'))
);

create index if not exists idx_policies_agent_id on policies (agent_id);
create index if not exists idx_policies_client_id on policies (client_id);
create index if not exists idx_policies_renewal_date on policies (renewal_date);

alter table policies enable row level security;

create policy "policies_select_own" on policies
  for select using (agent_id = auth.uid());
create policy "policies_insert_own" on policies
  for insert with check (agent_id = auth.uid());
create policy "policies_update_own" on policies
  for update using (agent_id = auth.uid());
create policy "policies_delete_own" on policies
  for delete using (agent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- tasks (מעקבים)
-- ---------------------------------------------------------------------------
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid references clients (id) on delete cascade,
  task_type varchar(50) not null, -- חידוש, תביעה, הצעת מחיר, יום הולדת, עדכון מסמכים...
  due_date date not null,
  priority varchar(20) not null default 'medium'
    check (priority in ('high', 'medium', 'low')),
  status varchar(20) not null default 'open'
    check (status in ('open', 'in_progress', 'completed')),
  description text
);

create index if not exists idx_tasks_agent_id on tasks (agent_id);
create index if not exists idx_tasks_due_date on tasks (due_date);

alter table tasks enable row level security;

create policy "tasks_select_own" on tasks
  for select using (agent_id = auth.uid());
create policy "tasks_insert_own" on tasks
  for insert with check (agent_id = auth.uid());
create policy "tasks_update_own" on tasks
  for update using (agent_id = auth.uid());
create policy "tasks_delete_own" on tasks
  for delete using (agent_id = auth.uid());

-- ---------------------------------------------------------------------------
-- communication_logs (יומן תקשורת) - append-only audit trail
-- ---------------------------------------------------------------------------
create table if not exists communication_logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  created_at timestamptz not null default now(),
  client_id uuid not null references clients (id) on delete cascade,
  channel varchar(20) not null check (channel in ('whatsapp', 'sms')),
  message_body text not null,
  delivery_status varchar(20) not null default 'sent'
    check (delivery_status in ('sent', 'delivered', 'failed'))
);

create index if not exists idx_communication_logs_agent_id on communication_logs (agent_id);
create index if not exists idx_communication_logs_client_id on communication_logs (client_id);

alter table communication_logs enable row level security;

create policy "communication_logs_select_own" on communication_logs
  for select using (agent_id = auth.uid());
create policy "communication_logs_insert_own" on communication_logs
  for insert with check (agent_id = auth.uid());

-- communication_logs is append-only: no update/delete policy is defined,
-- so those operations are denied by default under RLS (audit requirement).

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_set_updated_at before update on clients
  for each row execute function set_updated_at();
create trigger policies_set_updated_at before update on policies
  for each row execute function set_updated_at();
create trigger tasks_set_updated_at before update on tasks
  for each row execute function set_updated_at();
