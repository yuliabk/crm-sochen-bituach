-- CRM for insurance agents: core schema + Row-Level Security
-- Entities: agents (owners of data), clients, policies, tasks, logs

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
create type channel_preference as enum ('auto', 'whatsapp_only', 'sms_only');
create type client_status as enum ('active', 'inactive', 'lead');

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  national_id text,
  full_name text not null,
  phone text not null,
  email text,
  birth_date date,
  channel_preference channel_preference not null default 'auto',
  status client_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_agent_id_idx on clients (agent_id);
create index if not exists clients_birth_date_idx on clients (birth_date);

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
create type insurance_branch as enum ('car', 'home', 'health', 'life', 'pension', 'other');
create type policy_status as enum ('active', 'expired', 'cancelled', 'pending_renewal');

create table if not exists policies (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  insurance_company text not null,
  branch insurance_branch not null,
  start_date date not null,
  renewal_date date not null,
  monthly_premium numeric(12, 2) not null default 0,
  status policy_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists policies_agent_id_idx on policies (agent_id);
create index if not exists policies_client_id_idx on policies (client_id);
create index if not exists policies_renewal_date_idx on policies (renewal_date);

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
-- tasks
-- ---------------------------------------------------------------------------
create type task_type as enum ('renewal', 'claim', 'quote', 'birthday', 'other');
create type task_status as enum ('open', 'in_progress', 'done', 'cancelled');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  client_id uuid references clients (id) on delete cascade,
  task_type task_type not null default 'other',
  due_date date,
  status task_status not null default 'open',
  priority task_priority not null default 'medium',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_agent_id_idx on tasks (agent_id);
create index if not exists tasks_due_date_idx on tasks (due_date);
create index if not exists tasks_status_idx on tasks (status);

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
-- logs (communication log - append-only, audit trail for WhatsApp/SMS sends)
-- ---------------------------------------------------------------------------
create type comm_channel as enum ('whatsapp', 'sms');
create type send_status as enum ('queued', 'sent', 'delivered', 'failed');

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents (id) on delete cascade,
  client_id uuid not null references clients (id) on delete cascade,
  channel comm_channel not null,
  message_content text not null,
  send_status send_status not null default 'queued',
  sent_at timestamptz not null default now()
);

create index if not exists logs_agent_id_idx on logs (agent_id);
create index if not exists logs_client_id_idx on logs (client_id);
create index if not exists logs_sent_at_idx on logs (sent_at);

alter table logs enable row level security;

create policy "logs_select_own" on logs
  for select using (agent_id = auth.uid());
create policy "logs_insert_own" on logs
  for insert with check (agent_id = auth.uid());

-- logs are append-only: no update/delete policy is defined, so those
-- operations are denied by default under RLS (audit trail requirement).

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
