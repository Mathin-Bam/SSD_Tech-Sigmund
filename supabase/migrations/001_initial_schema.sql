-- SSD-Tech Project Tracker — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- After running: create two auth users manually in Authentication tab
--   admin@ssd-tech.com  → then UPDATE profiles SET role='admin' WHERE id='<that-user-uuid>'
--   client@ssd-tech.com → role stays 'executive' (default)

-- 1. Extensions
create extension if not exists "uuid-ossp";

-- 2. Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin', 'executive')) default 'executive',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', new.email), 
    coalesce(new.raw_user_meta_data->>'role', 'executive')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Features
create table if not exists public.features (
  feature_id text primary key,
  feature_name text not null,
  description text default '',
  phase_id text,
  phase_name text,
  module_name text,
  priority text check (priority in ('Low','Medium','High','Critical')) default 'Medium',
  assigned_to text,
  owner text,
  team text,
  stage text check (stage in ('Design','Development','Testing','Deployment','Done')) default 'Design',
  status text default 'Not Started',
  progress integer check (progress >= 0 and progress <= 100) default 0,
  start_date text,
  planned_deadline text,
  revised_deadline text,
  estimated_completion_date text,
  on_track_status text default 'On Track',
  current_task text default '',
  next_task text default '',
  dependencies text[] default '{}',
  blocker_note text default '',
  qa_status text default 'Not Started',
  design_status text default 'Not Started',
  development_status text default 'Not Started',
  last_updated_by text,
  last_updated_at text,
  client_visibility boolean default true,
  executive_summary text,
  mvp_url text,
  srs_requirement_id text,
  github_pr_url text,
  internal_notes text,
  created_at timestamptz default now()
);

-- 4. Team Members
create table if not exists public.team_members (
  user_id text primary key,
  email text,
  full_name text not null,
  role text not null,
  department text default 'Engineering',
  availability text check (availability in ('Available','Near Capacity','Overloaded')) default 'Available',
  active boolean default true,
  auth_user_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 5. Update Logs
create table if not exists public.update_logs (
  id uuid primary key default uuid_generate_v4(),
  feature_id text references public.features(feature_id) on delete cascade,
  changed_by uuid references auth.users(id),
  change_type text check (change_type in ('manual','github_push')) default 'manual',
  note text,
  created_at timestamptz default now()
);

-- 6. RLS Policies
alter table public.profiles enable row level security;
alter table public.features enable row level security;
alter table public.team_members enable row level security;
alter table public.update_logs enable row level security;

-- Profiles: users read own, admins read all
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);

-- Features
drop policy if exists "Admin full access features" on public.features;
create policy "Admin full access features" on public.features for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "Executive sees visible features" on public.features;
create policy "Executive sees visible features" on public.features for select
  using (
    client_visibility = true
    and (select role from public.profiles where id = auth.uid()) = 'executive'
  );

-- Team Members
drop policy if exists "Admin full access team" on public.team_members;
create policy "Admin full access team" on public.team_members for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "Executive reads team" on public.team_members;
create policy "Executive reads team" on public.team_members for select
  using ((select role from public.profiles where id = auth.uid()) = 'executive');

-- Update Logs
drop policy if exists "Admin reads logs" on public.update_logs;
create policy "Admin reads logs" on public.update_logs for select
  using ((select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "Service inserts logs" on public.update_logs;
create policy "Service inserts logs" on public.update_logs for insert
  with check (true);

-- 7. Seed Data
-- Features
insert into public.features (
  feature_id, feature_name, description, phase_id, phase_name, module_name, priority, assigned_to, owner, team, 
  stage, status, progress, start_date, planned_deadline, estimated_completion_date, current_task, next_task, 
  dependencies, blocker_note, qa_status, design_status, development_status, last_updated_by, last_updated_at, 
  client_visibility, executive_summary, mvp_url, srs_requirement_id, github_pr_url, internal_notes
) values 
('F-101', 'User Login with OTP', 'OTP login with SMS integration', 'P1', 'Phase 1', 'Authentication', 'High', 'Rahim', 'Nabila', 'Backend', 'Development', 'In Progress', 55, '2026-04-10', '2026-04-28', '2026-04-26', 'Backend OTP verification', 'Frontend integration', '{SMS gateway key}', 'Waiting for final gateway key', 'Not Started', 'Completed', 'In Progress', 'Rahim', '2026-04-20', true, 'OTP flow is on track for Phase 1; awaiting SMS provider credentials.', 'https://example.com/demo/login-otp', 'SRS-AUTH-12', 'https://github.com/ssd-tech/app/pull/101', 'Coordinate with infra for rate limits on OTP endpoint.'),
('F-102', 'Profile Edit Screen', 'User profile update and validation', 'P1', 'Phase 1', 'User Profile', 'Medium', 'Sadia', 'Nabila', 'Frontend', 'Testing', 'Testing', 82, '2026-04-08', '2026-04-24', '2026-04-24', 'Regression test pass', 'Release handoff', '{}', '', 'In Progress', 'Completed', 'Completed', 'QA Team', '2026-04-19', true, 'Profile edit in final QA; targeting handoff this week.', null, 'SRS-PROFILE-03', null, null),
('F-201', 'Reporting Dashboard Export', 'Export reports to CSV and PDF', 'P2', 'Phase 2', 'Analytics', 'Critical', 'Karim', 'Tanvir', 'Fullstack', 'Development', 'Blocked', 38, '2026-04-15', '2026-05-07', '2026-05-12', 'API pagination support', 'PDF renderer integration', '{Audit service endpoint}', 'Dependency unresolved with audit service', 'Not Started', 'Completed', 'Blocked', 'Karim', '2026-04-16', false, 'Export work paused pending audit dependency; SSD-Tech team is aligned on mitigation.', 'https://example.com/demo/reports', 'SRS-ANALYTICS-09', 'https://github.com/ssd-tech/app/pull/88', 'Blocked on audit service contract; escalate to platform team.')
on conflict (feature_id) do update set
  feature_name = excluded.feature_name,
  progress = excluded.progress,
  status = excluded.status;

-- Team Members
insert into public.team_members (user_id, full_name, role, department, availability) values
('U1', 'Rahim', 'Backend Developer', 'Engineering', 'Near Capacity'),
('U2', 'Sadia', 'Frontend Developer', 'Engineering', 'Available'),
('U3', 'Karim', 'Fullstack Developer', 'Engineering', 'Overloaded')
on conflict (user_id) do nothing;
