-- Mantém o resultado técnico e financeiro sincronizado com propostas concluídas.
-- O link público lê potência, economia e payback de solar_system_calculations.

create unique index if not exists solar_system_calculations_proposal_id_unique
  on public.solar_system_calculations (proposal_id);

create or replace function public.safe_numeric_text(p_value text)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when trim(coalesce(p_value, '')) ~ '^-?[0-9]+([.,][0-9]+)?$'
      then replace(trim(p_value), ',', '.')::numeric
    else null
  end;
$$;

revoke all on function public.safe_numeric_text(text) from public, anon, authenticated;

create or replace function public.sync_proposal_solar_calculation(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  p public.proposals%rowtype;
  v_hsp numeric;
  v_performance_ratio_percent numeric;
  v_performance_ratio numeric;
  v_generation_increase_percent numeric;
  v_availability_kwh numeric;
  v_compensable_kwh numeric;
  v_target_generation_kwh numeric;
  v_installed_power_kwp numeric;
  v_estimated_generation_kwh numeric;
  v_effective_tariff numeric;
  v_monthly_savings numeric;
  v_annual_savings numeric;
  v_payback_years numeric;
  v_payback_months integer;
  v_payback_years_whole integer;
  v_payback_remaining_months integer;
  v_payback_formatted text;
  v_module_power_w numeric;
  v_panel_count integer;
  v_inverter_power_kw numeric;
  v_required_power_kwp numeric;
  v_excess_kwh numeric;
  v_excess_percentage numeric;
  v_tariffs_percent numeric;
begin
  select *
    into p
  from public.proposals
  where id = p_proposal_id
    and flow_completed is true;

  if not found then
    return;
  end if;

  v_hsp := public.safe_numeric_text(p.flow_state ->> 'hspDaily');
  v_performance_ratio_percent := public.safe_numeric_text(p.flow_state ->> 'performanceRatioPercent');
  v_generation_increase_percent := coalesce(public.safe_numeric_text(p.flow_state ->> 'generationIncreasePercent'), 0);
  v_installed_power_kwp := public.safe_numeric_text(p.solar_kit_snapshot ->> 'kit_power_kwp');
  v_module_power_w := public.safe_numeric_text(p.solar_kit_snapshot ->> 'module_power_w');
  v_panel_count := coalesce(public.safe_numeric_text(p.solar_kit_snapshot ->> 'module_quantity'), 0)::integer;
  v_inverter_power_kw := public.safe_numeric_text(p.solar_kit_snapshot ->> 'inverter_power_kw');

  if p.monthly_consumption_kwh is null
     or p.monthly_consumption_kwh <= 0
     or v_hsp is null
     or v_hsp <= 0
     or v_performance_ratio_percent is null
     or v_performance_ratio_percent <= 0
     or v_installed_power_kwp is null
     or v_installed_power_kwp <= 0
     or p.energy_tariff is null
     or p.energy_tariff <= 0
     or p.final_price is null
     or p.final_price <= 0 then
    return;
  end if;

  v_performance_ratio := v_performance_ratio_percent / 100;
  v_availability_kwh := case p.flow_state ->> 'connectionType'
    when 'monophase' then 30
    when 'biphase' then 50
    when 'triphase' then 100
    else 0
  end;
  v_compensable_kwh := greatest(p.monthly_consumption_kwh - v_availability_kwh, 0);
  v_target_generation_kwh := v_compensable_kwh * (1 + v_generation_increase_percent / 100);
  v_estimated_generation_kwh := v_installed_power_kwp * v_hsp * 30 * v_performance_ratio;
  v_required_power_kwp := case
    when v_hsp > 0 and v_performance_ratio > 0
      then (v_target_generation_kwh / 30) / (v_hsp * v_performance_ratio)
    else null
  end;

  v_tariffs_percent :=
    coalesce(public.safe_numeric_text(p.flow_state #>> '{paybackForm,pisPercent}'), 0)
    + coalesce(public.safe_numeric_text(p.flow_state #>> '{paybackForm,cofinsPercent}'), 0)
    + coalesce(public.safe_numeric_text(p.flow_state #>> '{paybackForm,icmsPercent}'), 0)
    + coalesce(public.safe_numeric_text(p.flow_state #>> '{paybackForm,otherTariffsPercent}'), 0);
  v_effective_tariff := p.energy_tariff * (1 + v_tariffs_percent / 100);
  v_monthly_savings := round(least(v_compensable_kwh, v_estimated_generation_kwh) * v_effective_tariff, 2);
  v_annual_savings := round(v_monthly_savings * 12, 2);

  if v_annual_savings <= 0 then
    return;
  end if;

  v_payback_years := round(p.final_price / v_annual_savings, 2);
  v_payback_months := ceil(v_payback_years * 12)::integer;
  v_payback_years_whole := v_payback_months / 12;
  v_payback_remaining_months := v_payback_months % 12;
  v_payback_formatted := case
    when v_payback_years_whole > 0 and v_payback_remaining_months > 0 then
      format(
        '%s %s e %s %s',
        v_payback_years_whole,
        case when v_payback_years_whole = 1 then 'ano' else 'anos' end,
        v_payback_remaining_months,
        case when v_payback_remaining_months = 1 then 'mês' else 'meses' end
      )
    when v_payback_years_whole > 0 then
      format('%s %s', v_payback_years_whole, case when v_payback_years_whole = 1 then 'ano' else 'anos' end)
    else
      format('%s %s', v_payback_remaining_months, case when v_payback_remaining_months = 1 then 'mês' else 'meses' end)
  end;

  v_excess_kwh := round(v_estimated_generation_kwh - v_target_generation_kwh, 2);
  v_excess_percentage := case
    when v_target_generation_kwh > 0
      then round(((v_estimated_generation_kwh / v_target_generation_kwh) - 1) * 100, 2)
    else null
  end;

  insert into public.solar_system_calculations (
    proposal_id,
    hsp,
    panel_power_w,
    yield_factor,
    generation_target_percent,
    history,
    monthly_consumption_kwh,
    projected_consumption_kwh,
    required_power_kwp,
    panel_count,
    installed_power_kwp,
    estimated_monthly_generation_kwh,
    excess_kwh,
    excess_percentage,
    min_inverter_power_kw,
    current_bill_value,
    energy_tariff,
    monthly_savings,
    annual_savings,
    payback_years,
    payback_months,
    payback_formatted,
    return_25_years,
    net_savings_25_years,
    updated_at
  ) values (
    p.id,
    round(v_hsp, 4),
    v_module_power_w,
    round(v_performance_ratio, 4),
    round(100 + v_generation_increase_percent, 2),
    p.history,
    round(p.monthly_consumption_kwh, 2),
    round(v_target_generation_kwh, 2),
    round(v_required_power_kwp, 3),
    v_panel_count,
    round(v_installed_power_kwp, 3),
    round(v_estimated_generation_kwh, 2),
    v_excess_kwh,
    v_excess_percentage,
    v_inverter_power_kw,
    p.bill_amount,
    round(v_effective_tariff, 4),
    v_monthly_savings,
    v_annual_savings,
    v_payback_years,
    v_payback_months,
    v_payback_formatted,
    round(v_annual_savings * 25, 2),
    round((v_annual_savings * 25) - p.final_price, 2),
    now()
  )
  on conflict (proposal_id) do update set
    hsp = excluded.hsp,
    panel_power_w = excluded.panel_power_w,
    yield_factor = excluded.yield_factor,
    generation_target_percent = excluded.generation_target_percent,
    history = excluded.history,
    monthly_consumption_kwh = excluded.monthly_consumption_kwh,
    projected_consumption_kwh = excluded.projected_consumption_kwh,
    required_power_kwp = excluded.required_power_kwp,
    panel_count = excluded.panel_count,
    installed_power_kwp = excluded.installed_power_kwp,
    estimated_monthly_generation_kwh = excluded.estimated_monthly_generation_kwh,
    excess_kwh = excluded.excess_kwh,
    excess_percentage = excluded.excess_percentage,
    min_inverter_power_kw = excluded.min_inverter_power_kw,
    current_bill_value = excluded.current_bill_value,
    energy_tariff = excluded.energy_tariff,
    monthly_savings = excluded.monthly_savings,
    annual_savings = excluded.annual_savings,
    payback_years = excluded.payback_years,
    payback_months = excluded.payback_months,
    payback_formatted = excluded.payback_formatted,
    return_25_years = excluded.return_25_years,
    net_savings_25_years = excluded.net_savings_25_years,
    updated_at = now();
end;
$$;

revoke all on function public.sync_proposal_solar_calculation(uuid) from public, anon, authenticated;

create or replace function public.sync_completed_proposal_solar_calculation_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.flow_completed is true then
    perform public.sync_proposal_solar_calculation(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.sync_completed_proposal_solar_calculation_trigger() from public, anon, authenticated;

drop trigger if exists sync_completed_proposal_solar_calculation on public.proposals;
create trigger sync_completed_proposal_solar_calculation
  after insert or update of
    flow_completed,
    flow_state,
    monthly_consumption_kwh,
    energy_tariff,
    bill_amount,
    final_price,
    solar_kit_snapshot,
    history
  on public.proposals
  for each row
  execute function public.sync_completed_proposal_solar_calculation_trigger();

do $$
declare
  r record;
begin
  for r in
    select id
    from public.proposals
    where flow_completed is true
  loop
    perform public.sync_proposal_solar_calculation(r.id);
  end loop;
end;
$$;
