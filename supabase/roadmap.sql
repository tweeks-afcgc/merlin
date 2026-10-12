create table if not exists roadmap_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table roadmap_items enable row level security;

-- Only admins (via server-side service role) can access; no anon/user policies needed
-- Server actions use createClient() which runs as the authenticated user,
-- but we gate all mutations behind an admin role check in the action itself.
create policy "Admin full access" on roadmap_items
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
