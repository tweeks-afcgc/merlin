create table if not exists injury_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Reporter
  reporter_name text not null,
  reporter_role text not null,
  reporter_team_id uuid references teams(id) on delete set null,
  reporter_contact text not null,

  -- When and where
  incident_date date not null,
  incident_time time,
  venue_id uuid references venues(id) on delete set null,
  venue_label text, -- 'Away', 'Other', or null (home venue used)
  activity text, -- match, training, other
  opposition text,

  -- Injured person
  injured_name text not null,
  injured_role text,
  is_under_18 boolean,
  parent_carer_present boolean,

  -- Injury
  what_happened text not null,
  body_part text,
  injury_type text,
  injury_description text,

  -- Response
  first_aid_given text,
  first_aid_by text,
  defib_used boolean,
  ambulance_called boolean,
  outcome text,
  parent_carer_informed boolean,
  parent_carer_informed_when text,
  suspected_concussion boolean,

  -- Admin (editable after submission)
  status text not null default 'open',
  reported_to_league boolean,
  reported_to_league_date date,
  reported_to_kent_fa boolean,
  reported_to_kent_fa_date date,
  reported_to_insurer boolean,
  reported_to_insurer_date date,
  fit_to_return_date date,
  admin_notes text,
  closed_by text,
  closed_date date
);

-- Allow anonymous inserts (public form)
alter table injury_logs enable row level security;

create policy "Anyone can insert injury_logs"
  on injury_logs for insert
  with check (true);

create policy "Admins can read and update injury_logs"
  on injury_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update injury_logs"
  on injury_logs for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
