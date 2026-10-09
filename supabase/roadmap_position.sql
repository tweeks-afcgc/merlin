alter table roadmap_items add column if not exists position integer not null default 0;

-- Seed existing rows with sequential positions based on created_at
update roadmap_items
set position = sub.rn
from (
  select id, row_number() over (order by created_at asc) as rn
  from roadmap_items
) sub
where roadmap_items.id = sub.id;
