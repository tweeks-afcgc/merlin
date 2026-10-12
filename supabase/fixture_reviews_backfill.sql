-- Auto-create review link rows for fixtures played on 11 Oct 2026
-- that had a referee assigned by us (not league-assigned).
-- Run once in the Supabase SQL editor.

insert into fixture_reviews (fixture_id)
select id
from fixtures
where date = '2026-10-11'
  and (referee_id is not null or volunteer_referee_id is not null)
  and (league_assigned_referee is null or league_assigned_referee = false)
  and (cancelled is null or cancelled = false)
on conflict (fixture_id) do nothing;
