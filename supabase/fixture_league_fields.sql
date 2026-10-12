alter table fixtures
  add column if not exists league_notes text,
  add column if not exists videoing_allowed boolean,
  add column if not exists opp_colours text,
  add column if not exists opp_fixture_sec_name text,
  add column if not exists opp_fixture_sec_email text,
  add column if not exists opp_fixture_sec_phone text,
  add column if not exists opp_manager_name text,
  add column if not exists opp_manager_email text,
  add column if not exists opp_manager_phone text,
  add column if not exists opp_venue_name text,
  add column if not exists opp_venue_address text;
