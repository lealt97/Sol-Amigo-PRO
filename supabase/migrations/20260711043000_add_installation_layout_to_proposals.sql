alter table public.proposals
  add column if not exists roof_image_url text,
  add column if not exists module_width_m numeric,
  add column if not exists module_height_m numeric,
  add column if not exists roof_layout_json jsonb;

comment on column public.proposals.roof_image_url is 'URL pública da foto do telhado/local de instalação usada na planimetria.';
comment on column public.proposals.module_width_m is 'Largura aproximada de cada módulo fotovoltaico em metros.';
comment on column public.proposals.module_height_m is 'Altura aproximada de cada módulo fotovoltaico em metros.';
comment on column public.proposals.roof_layout_json is 'Layout JSON dos módulos sobre a foto do telhado, incluindo posição, rotação e strings.';
