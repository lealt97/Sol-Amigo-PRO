-- Dimensões físicas dos módulos fotovoltaicos cadastrados no kit.
-- Campos inicialmente nulos para preservar kits existentes; o formulário exige A x L em novos cadastros e edições.

alter table public.solar_kits
  add column if not exists module_height_m numeric,
  add column if not exists module_width_m numeric;

alter table public.solar_kits
  drop constraint if exists solar_kits_module_height_m_positive,
  drop constraint if exists solar_kits_module_width_m_positive;

alter table public.solar_kits
  add constraint solar_kits_module_height_m_positive
    check (module_height_m is null or module_height_m > 0),
  add constraint solar_kits_module_width_m_positive
    check (module_width_m is null or module_width_m > 0);

comment on column public.solar_kits.module_height_m is
  'Altura A do módulo fotovoltaico, em metros, usada no cálculo da ocupação do telhado.';

comment on column public.solar_kits.module_width_m is
  'Largura L do módulo fotovoltaico, em metros, usada no cálculo da ocupação do telhado.';
