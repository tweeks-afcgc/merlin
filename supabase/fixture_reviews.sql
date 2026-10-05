create table if not exists fixture_reviews (
  id uuid primary key default gen_random_uuid(),
  fixture_id uuid not null unique references fixtures(id) on delete cascade,
  -- Tokens for the two review links
  ref_token uuid not null unique default gen_random_uuid(),
  manager_token uuid not null unique default gen_random_uuid(),
  -- Referee's review of the club
  ref_submitted_at timestamptz,
  ref_coaches_score smallint check (ref_coaches_score between 1 and 5),
  ref_spectators_score smallint check (ref_spectators_score between 1 and 5),
  ref_players_score smallint check (ref_players_score between 1 and 5),
  ref_experience_score smallint check (ref_experience_score between 1 and 5),
  ref_comments text,
  -- Manager's review of the referee
  manager_submitted_at timestamptz,
  manager_ref_score smallint check (manager_ref_score between 1 and 5),
  manager_comments text,
  created_at timestamptz not null default now()
);
