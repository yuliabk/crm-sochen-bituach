-- Append-only audit trail for access to and mutations of sensitive CRM data.
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  -- Deliberately not cascaded from agents: audit history must survive account
  -- deletion and remains accessible to privileged compliance tooling.
  agent_id uuid not null,
  created_at timestamptz not null default now(),
  action varchar(20) not null
    check (action in ('select', 'insert', 'update', 'delete')),
  entity_type varchar(50) not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_audit_logs_agent_created
  on audit_logs (agent_id, created_at desc);

alter table audit_logs enable row level security;

create policy "audit_logs_select_own" on audit_logs
  for select using (agent_id = auth.uid());
create policy "audit_logs_insert_own" on audit_logs
  for insert with check (agent_id = auth.uid());

-- No update/delete policies: audit records are immutable.
create or replace function public.log_sensitive_change()
returns trigger as $$
declare
  audited_agent_id uuid;
  audited_entity_id uuid;
begin
  if tg_op = 'DELETE' then
    audited_agent_id := old.agent_id;
    audited_entity_id := old.id;
  else
    audited_agent_id := new.agent_id;
    audited_entity_id := new.id;
  end if;

  insert into public.audit_logs (
    agent_id,
    action,
    entity_type,
    entity_id
  ) values (
    audited_agent_id,
    lower(tg_op),
    tg_table_name,
    audited_entity_id
  );

  -- This is an AFTER trigger, so its return value is ignored.
  return null;
end;
$$ language plpgsql;

create trigger clients_audit_changes
  after insert or update or delete on clients
  for each row execute function public.log_sensitive_change();
create trigger policies_audit_changes
  after insert or update or delete on policies
  for each row execute function public.log_sensitive_change();
create trigger tasks_audit_changes
  after insert or update or delete on tasks
  for each row execute function public.log_sensitive_change();

-- Prevent a policy/task owned by one agent from pointing at another agent's
-- client, even when writes bypass the application API (imports, n8n, etc.).
alter table clients add constraint clients_id_agent_unique unique (id, agent_id);

alter table policies drop constraint if exists policies_client_id_fkey;
alter table policies add constraint policies_client_agent_fkey
  foreign key (client_id, agent_id) references clients (id, agent_id)
  on delete cascade;

alter table tasks drop constraint if exists tasks_client_id_fkey;
alter table tasks add constraint tasks_client_agent_fkey
  foreign key (client_id, agent_id) references clients (id, agent_id)
  on delete cascade;
