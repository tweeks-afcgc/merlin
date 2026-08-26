ALTER TABLE public.player_team_seasons
  ADD COLUMN IF NOT EXISTS player_number INTEGER;
