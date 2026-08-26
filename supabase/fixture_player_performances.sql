-- Player performance records per fixture
CREATE TABLE IF NOT EXISTS public.fixture_player_performances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL REFERENCES public.fixtures(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  played BOOLEAN NOT NULL DEFAULT false,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  motm BOOLEAN NOT NULL DEFAULT false,
  mins_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(fixture_id, player_id)
);

ALTER TABLE public.fixture_player_performances ENABLE ROW LEVEL SECURITY;

-- Admins and team managers can read/write
CREATE POLICY "Authenticated users can read performances"
  ON public.fixture_player_performances FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins and managers can upsert performances"
  ON public.fixture_player_performances FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Admins and managers can update performances"
  ON public.fixture_player_performances FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Admins and managers can delete performances"
  ON public.fixture_player_performances FOR DELETE
  TO authenticated USING (true);
