-- Kits fechados do fornecedor não são revalidados por oversizing no Sol Amigo PRO.
alter table if exists public.solar_kits
  drop column if exists inverter_max_pv_power_kwp,
  drop column if exists inverter_max_dc_ac_ratio;

alter table if exists public.solar_system_calculations
  drop column if exists oversizing;
