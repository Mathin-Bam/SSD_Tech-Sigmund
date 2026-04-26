-- 1. Update roles for Profiles
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';
    
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role in ('admin', 'executive', 'dev'));

-- Update roles for team_members (no check constraint originally, but let's just make sure)
-- team_members had: role text not null

-- 2. Create messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text references public.team_members(user_id) on delete cascade,
  receiver_id text references public.team_members(user_id) on delete cascade,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 3. RLS for messages
alter table public.messages enable row level security;

drop policy if exists "Users can read own messages" on public.messages;
create policy "Users can read own messages" on public.messages for select
  using (
    sender_id = (select auth.uid()::text) or 
    receiver_id = (select auth.uid()::text) or
    (select role from public.profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Users can insert own messages" on public.messages;
create policy "Users can insert own messages" on public.messages for insert
  with check (
    sender_id = (select auth.uid()::text)
  );

-- 4. Update Features RLS for 'dev' role
drop policy if exists "Admin and Dev full access features" on public.features;
create policy "Admin and Dev full access features" on public.features for all
  using (
    (select role from public.profiles where id = auth.uid()) in ('admin', 'dev')
  );

-- Drop old Admin only policy to avoid conflicts if needed, but 'Admin full access features' was for all
drop policy if exists "Admin full access features" on public.features;


-- 5. Remove seeded dummy users
delete from public.team_members where user_id in ('U1', 'U2', 'U3');
-- Delete from features assigned to them to avoid dangling or leave as is (assigned_to is text, not fk)
