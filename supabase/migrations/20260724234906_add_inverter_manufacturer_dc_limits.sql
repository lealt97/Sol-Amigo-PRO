-- Limites DC do fabricante para o inversor do kit
alter table public.solar_kits
  add column if not exists inverter_max_pv_power_kwp numeric
    check (inverter_max_pv_power_kwp is null or inverter_max_pv_power_kwp > 0),
  add column if not exists inverter_max_dc_ac_ratio numeric
    check (inverter_max_dc_ac_ratio is null or inverter_max_dc_ac_ratio > 0);

comment on column public.solar_kits.inverter_max_pv_power_kwp is
  'Potência FV máxima admitida pelo modelo do inversor, em kWp, conforme datasheet.';
comment on column public.solar_kits.inverter_max_dc_ac_ratio is
  'Relação DC/AC máxima admitida pelo modelo do inversor, conforme datasheet.';
