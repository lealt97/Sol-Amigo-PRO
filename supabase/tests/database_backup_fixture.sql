\set ON_ERROR_STOP on

-- Fixture determinística e descartável. Não contém credenciais utilizáveis.
insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  is_sso_user, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  'b1000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'backup-restore@solamigo.invalid',
  '2026-01-15T12:00:00Z',
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Usuário Backup Restore","company_name":"SolAmigo Backup Lab"}'::jsonb,
  '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z', false, false
);

-- Substitui os registros automáticos do gatilho por valores determinísticos.
delete from public.billing_events
where account_id = 'b1000000-0000-4000-8000-000000000001';

delete from public.account_usage
where account_id = 'b1000000-0000-4000-8000-000000000001';

delete from public.subscriptions
where account_id = 'b1000000-0000-4000-8000-000000000001';

insert into public.subscriptions (
  id, account_id, plan_code, billing_interval, status,
  cancel_at_period_end, metadata, created_at, updated_at
) values (
  'b1100000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'free', 'free', 'free', false,
  '{"source":"database_backup_restore_test"}'::jsonb,
  '2026-01-15T12:00:10Z', '2026-01-15T12:00:10Z'
);

insert into public.billing_events (
  id, account_id, subscription_id, event_type, source, metadata, created_at
) values (
  'b1100000-0000-4000-8000-000000000002',
  'b1000000-0000-4000-8000-000000000001',
  'b1100000-0000-4000-8000-000000000001',
  'subscription.initialized', 'system',
  '{"plan_code":"free","source":"database_backup_restore_test"}'::jsonb,
  '2026-01-15T12:00:20Z'
);

insert into public.account_usage (
  id, account_id, plan_code, period_start, period_end, timezone,
  proposals_created, storage_bytes, users_count, version, created_at, updated_at
) values (
  'b1100000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000001',
  'free', '2026-01-01', '2026-02-01', 'America/Sao_Paulo',
  1, 126974, 1, 3,
  '2026-01-15T12:00:25Z', '2026-01-15T12:00:25Z'
);

insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  'b1000000-0000-4000-8000-000000000002',
  'backup-restore@solamigo.invalid',
  'b1000000-0000-4000-8000-000000000001',
  '{"sub":"b1000000-0000-4000-8000-000000000001","email":"backup-restore@solamigo.invalid","email_verified":true}'::jsonb,
  'email', '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'
);

insert into auth.mfa_factors (
  id, user_id, friendly_name, factor_type, status, created_at, updated_at
) values (
  'b1000000-0000-4000-8000-000000000003',
  'b1000000-0000-4000-8000-000000000001',
  'Fator descartável de backup', 'totp', 'unverified',
  '2026-01-15T12:00:00Z', '2026-01-15T12:00:00Z'
);

insert into public.mfa_recovery_codes (
  id, user_id, factor_id, code_hash, code_hint, created_at
) values (
  'b1000000-0000-4000-8000-000000000004',
  'b1000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000003',
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'C0DE',
  '2026-01-15T12:00:30Z'
);

insert into public.mfa_security_events (
  id, user_id, event_type, factor_id, actor_role, metadata, created_at
) values (
  'b1000000-0000-4000-8000-000000000005',
  'b1000000-0000-4000-8000-000000000001',
  'mfa_removed',
  'b1000000-0000-4000-8000-000000000003',
  'database_backup_fixture',
  '{"factor_type":"totp","source":"database_backup_restore_test","verified_factor_count":0}'::jsonb,
  '2026-01-15T12:00:45Z'
);

update public.profiles
set name = 'Usuário Backup Restore',
    company_name = 'SolAmigo Backup Lab',
    company_email = 'backup-restore@solamigo.invalid',
    default_margin_percentage = 25,
    default_validity_days = 7,
    platform_theme = '{"primary":"#0076DD","secondary":"#64B0F3"}'::jsonb,
    created_at = '2026-01-15T12:00:00Z',
    updated_at = '2026-01-15T12:00:00Z'
where id = 'b1000000-0000-4000-8000-000000000001';

insert into public.clients (
  id, user_id, name, email, city, state, avg_consumption_kwh,
  notes, status, created_at, updated_at
) values (
  'b2000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'Cliente Backup Restore', 'cliente-backup@solamigo.invalid',
  'São Paulo', 'SP', 650, 'Registro determinístico de homologação.',
  'active', '2026-01-15T12:01:00Z', '2026-01-15T12:01:00Z'
);

insert into public.solar_kits (
  id, user_id, name, supplier, module_power_w, module_quantity,
  inverter_power_kw, cost_price, sale_price, active,
  created_at, updated_at, system_type
) values (
  'b3000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'Kit Backup 6,6 kWp', 'Fornecedor Backup', 550, 12, 6,
  14500, 21500, true,
  '2026-01-15T12:02:00Z', '2026-01-15T12:02:00Z', 'on_grid'
);

insert into public.proposals (
  id, user_id, client_id, code, title, status,
  monthly_consumption_kwh, energy_tariff, total_cost, final_price,
  estimated_profit, margin_percentage, public_token,
  public_token_expires_at, created_at, updated_at,
  selected_solar_kit_id, solar_kit_snapshot, system_type, history, revision
) values (
  'b4000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'b2000000-0000-4000-8000-000000000001',
  'BKP-2026-0001', 'Proposta Backup Restore', 'pending',
  650, 1.20, 21500, 28093.34, 6593.34, 25,
  'b4000000000040008000000000000001', '2026-12-31T23:59:59Z',
  '2026-01-15T12:03:00Z', '2026-01-15T12:03:00Z',
  'b3000000-0000-4000-8000-000000000001',
  '{"name":"Kit Backup 6,6 kWp","kit_power_kwp":6.6,"module_quantity":12,"module_power_w":550,"system_type":"on_grid"}'::jsonb,
  'on_grid', '[{"event":"created","at":"2026-01-15T12:03:00Z"}]'::jsonb, 3
);

insert into public.solar_system_calculations (
  id, proposal_id, hsp, panel_power_w, monthly_consumption_kwh,
  required_power_kwp, panel_count, installed_power_kwp,
  estimated_monthly_generation_kwh, monthly_savings, annual_savings,
  payback_years, payback_months, payback_formatted,
  created_at, updated_at, history
) values (
  'b5000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  4.8, 550, 650, 5.9, 12, 6.6, 720, 720, 8640,
  3.25, 3, '3 anos e 3 meses',
  '2026-01-15T12:04:00Z', '2026-01-15T12:04:00Z',
  '[{"calculation":"initial"}]'::jsonb
);

insert into public.proposal_loads (
  id, proposal_id, equipment_name, power_watts, quantity,
  hours_per_day, daily_consumption, created_at, updated_at
) values (
  'b6000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'Ar-condicionado', 1200, 2, 6, 14.4,
  '2026-01-15T12:05:00Z', '2026-01-15T12:05:00Z'
);

insert into public.proposal_events (
  id, proposal_id, user_id, event_type, description, metadata, created_at
) values (
  'b7000000-0000-4000-8000-000000000001',
  'b4000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'backup_fixture_created', 'Evento de homologação de backup e restauração.',
  '{"source":"database_backup_restore_test"}'::jsonb,
  '2026-01-15T12:06:00Z'
);

insert into public.pdf_templates (
  id, user_id, name, primary_color, secondary_color,
  accent_color, background_color, is_default, created_at, updated_at
) values (
  'b8000000-0000-4000-8000-000000000001',
  'b1000000-0000-4000-8000-000000000001',
  'Modelo Backup Restore', '#0076DD', '#64B0F3', '#FACB5C', '#0E2337',
  true, '2026-01-15T12:07:00Z', '2026-01-15T12:07:00Z'
);

insert into public.pdf_user_models (
  id, user_id, preset_id, name, theme, logo_transform,
  cover_image_transform, page_config, is_default, created_at, updated_at
) values (
  'backup-restore-model',
  'b1000000-0000-4000-8000-000000000001',
  'preset-01', 'Modelo Visual Backup',
  '{"primary":"#0076DD","secondary":"#64B0F3","accent":"#FACB5C","neutral":"#0E2337"}'::jsonb,
  '{"x":0,"y":0,"zoom":1,"rotate":0}'::jsonb,
  '{"x":5,"y":-3,"zoom":1.1,"rotate":0}'::jsonb,
  '{"order":["cover","intro","technical","financial","payback"]}'::jsonb,
  true, '2026-01-15T12:08:00Z', '2026-01-15T12:08:00Z'
);

insert into public.proposal_sequences (user_id, sequence_year, last_value, updated_at)
values (
  'b1000000-0000-4000-8000-000000000001',
  2026, 37, '2026-01-15T12:09:00Z'
);

insert into storage.buckets (
  id, name, owner, created_at, updated_at, public, owner_id, type
) values (
  'backup-restore-fixture', 'backup-restore-fixture',
  'b1000000-0000-4000-8000-000000000001',
  '2026-01-15T12:10:00Z', '2026-01-15T12:10:00Z', false,
  'b1000000-0000-4000-8000-000000000001', 'STANDARD'
);

insert into storage.objects (
  id, bucket_id, name, owner, created_at, updated_at,
  last_accessed_at, metadata, version, owner_id, user_metadata
) values (
  'b9000000-0000-4000-8000-000000000001',
  'backup-restore-fixture',
  'b1000000-0000-4000-8000-000000000001/proposals/backup-restore.pdf',
  'b1000000-0000-4000-8000-000000000001',
  '2026-01-15T12:11:00Z', '2026-01-15T12:11:00Z', '2026-01-15T12:11:00Z',
  '{"mimetype":"application/pdf","size":126974}'::jsonb,
  'backup-v1', 'b1000000-0000-4000-8000-000000000001',
  '{"purpose":"backup_restore_test"}'::jsonb
);

select 'database backup fixture created' as result;
