-- Add active flag to team_competitions
-- Inactive competitions are hidden from fixture dropdowns but kept for historical display
alter table team_competitions
  add column if not exists active boolean not null default true;
