-- Add internal_team_id to club_teams so internal opponents can have
-- their age group recomputed dynamically for any given season.

alter table club_teams add column if not exists internal_team_id uuid references teams(id) on delete set null;

-- Backfill: match existing [Internal] rows to their teams by base name.
-- Works when club_teams.name = '[Internal] Under N <team.name>'
update club_teams ct
set internal_team_id = t.id
from teams t
where ct.name like '[Internal]%'
  and ct.name like '%' || t.name
  and ct.internal_team_id is null;
