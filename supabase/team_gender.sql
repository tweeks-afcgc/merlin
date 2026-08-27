-- Add gender field to teams table
alter table teams
  add column if not exists gender text check (gender in ('Male', 'Female', 'Mixed'));
