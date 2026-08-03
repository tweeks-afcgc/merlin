-- Volunteers and volunteer_roles tables
-- Run this in the Supabase SQL editor

create table if not exists public.volunteers (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       text,
  is_app_user boolean not null default false,
  user_role   text,
  is_referee  boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.volunteer_roles (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  role_type    text not null check (role_type in ('club', 'team')),
  role_name    text not null,
  team_id      uuid references public.teams(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Indexes
create index if not exists volunteer_roles_volunteer_id_idx on public.volunteer_roles(volunteer_id);
create index if not exists volunteer_roles_team_id_idx on public.volunteer_roles(team_id);

-- RLS
alter table public.volunteers enable row level security;
alter table public.volunteer_roles enable row level security;

-- Authenticated users can read volunteers (for referee display etc)
create policy "volunteers_read" on public.volunteers
  for select to authenticated using (true);

-- Admins can do all operations
create policy "volunteers_admin_all" on public.volunteers
  for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "volunteer_roles_read" on public.volunteer_roles
  for select to authenticated using (true);

create policy "volunteer_roles_admin_all" on public.volunteer_roles
  for all to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
