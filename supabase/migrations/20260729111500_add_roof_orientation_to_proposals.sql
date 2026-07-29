alter table public.proposals
  add column if not exists roof_latitude_degrees numeric,
  add column if not exists roof_planes_json jsonb not null default '[]'::jsonb,
  add column if not exists roof_orientation_factor numeric,
  add column if not exists effective_performance_ratio numeric;

update public.proposals
set roof_planes_json = '[]'::jsonb
where roof_planes_json is null;

alter table public.proposals
  alter column roof_planes_json set default '[]'::jsonb,
  alter column roof_planes_json set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'proposals_roof_latitude_range'
  ) then
    alter table public.proposals
      add constraint proposals_roof_latitude_range
      check (roof_latitude_degrees is null or roof_latitude_degrees between -90 and 90);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'proposals_roof_planes_is_array'
  ) then
    alter table public.proposals
      add constraint proposals_roof_planes_is_array
      check (jsonb_typeof(roof_planes_json) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'proposals_roof_orientation_factor_range'
  ) then
    alter table public.proposals
      add constraint proposals_roof_orientation_factor_range
      check (roof_orientation_factor is null or roof_orientation_factor > 0 and roof_orientation_factor <= 1);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'proposals_effective_performance_ratio_range'
  ) then
    alter table public.proposals
      add constraint proposals_effective_performance_ratio_range
      check (effective_performance_ratio is null or effective_performance_ratio > 0 and effective_performance_ratio <= 1);
  end if;
end
$$;

comment on column public.proposals.roof_latitude_degrees is
  'Latitude usada na estimativa geométrica do fator solar das águas do telhado.';
comment on column public.proposals.roof_planes_json is
  'Águas do telhado com área útil, inclinação, azimute e ponto cardeal.';
comment on column public.proposals.roof_orientation_factor is
  'Fator solar ponderado das águas, de 0 a 1, relativo à orientação de referência.';
comment on column public.proposals.effective_performance_ratio is
  'Rendimento global efetivo após aplicar o fator solar ao rendimento-base.';
