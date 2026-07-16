-- Garante as colunas usadas pelo wizard e pela persistência transacional.
-- Este arquivo deve ser aplicado antes de 20260716210000_integrity_phase_2.sql.

begin;

alter table public.proposals
  add column if not exists history jsonb;

alter table public.solar_system_calculations
  add column if not exists history jsonb;

commit;
