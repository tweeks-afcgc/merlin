-- Add cancellation fields to fixtures
alter table fixtures add column if not exists cancelled boolean not null default false;
alter table fixtures add column if not exists cancellation_reason text;
