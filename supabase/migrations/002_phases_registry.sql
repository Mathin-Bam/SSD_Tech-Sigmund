-- 002_phases_registry.sql

create table if not exists public.phases (
  phase_id text primary key,
  phase_name text not null,
  start_date date,
  target_date date,
  status text check (status in ('On Track', 'Needs Attention', 'Delayed', 'Completed')) default 'On Track',
  owner text,
  created_at timestamptz default now()
);

alter table public.phases enable row level security;

drop policy if exists "Admin full access phases" on public.phases;
create policy "Admin full access phases" on public.phases for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "Executive reads phases" on public.phases;
create policy "Executive reads phases" on public.phases for select
  using ((select role from public.profiles where id = auth.uid()) = 'executive');

-- Seed Data to match existing features' phase_ids
insert into public.phases (phase_id, phase_name, start_date, target_date, status, owner) values
('P1', 'Phase 1', '2026-04-08', '2026-04-28', 'On Track', 'Nabila'),
('P2', 'Phase 2', '2026-04-15', '2026-05-12', 'Delayed', 'Tanvir')
on conflict (phase_id) do update set
  phase_name = excluded.phase_name,
  target_date = excluded.target_date,
  status = excluded.status;
