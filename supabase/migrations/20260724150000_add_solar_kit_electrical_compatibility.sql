-- Compatibilidade elétrica dos kits solares
alter table public.solar_kits
  add column if not exists grid_connection_type text
    check (grid_connection_type is null or grid_connection_type in ('monophase', 'biphase', 'triphase')),
  add column if not exists grid_voltage_v numeric
    check (grid_voltage_v is null or grid_voltage_v > 0);

comment on column public.solar_kits.grid_connection_type is
  'Tipo de ligação da unidade consumidora para a qual o kit foi configurado.';
comment on column public.solar_kits.grid_voltage_v is
  'Tensão nominal de conexão do kit, em volts.';
