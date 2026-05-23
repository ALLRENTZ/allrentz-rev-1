
alter table public.equipment enable row level security;

drop policy if exists "Public view equipment" on public.equipment;
drop policy if exists "Authenticated read full equipment" on public.equipment;
create policy "Authenticated read full equipment"
  on public.equipment for select to authenticated using (true);

drop view if exists public.equipment_public cascade;
create view public.equipment_public
  with (security_invoker = false) as
select
  e.id,
  e.title,
  e.category,
  e.image_url,
  left(coalesce(e.description, ''), 120) as description_teaser,
  split_part(e.location, ',', 1) as city,
  case
    when e.daily_rate < 250 then '$'
    when e.daily_rate < 750 then '$$'
    when e.daily_rate < 2000 then '$$$'
    else '$$$$'
  end as price_band,
  case
    when e.daily_rate < 250 then '<$250/day'
    when e.daily_rate < 750 then '$250–$750/day'
    when e.daily_rate < 2000 then '$750–$2,000/day'
    else '$2,000+/day'
  end as price_range_label,
  e.available
from public.equipment e;

grant select on public.equipment_public to anon, authenticated;
