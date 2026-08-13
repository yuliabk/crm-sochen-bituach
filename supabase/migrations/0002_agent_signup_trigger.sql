-- Auto-create an `agents` row whenever a new Supabase Auth user signs up,
-- so client/policy/task RLS policies (agent_id = auth.uid()) have a match.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.agents (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
