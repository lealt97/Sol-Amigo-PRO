-- Motor de payback: mantém compatibilidade com propostas antigas e usa o snapshot
-- calculado pelo motor TypeScript como fonte oficial para novas propostas.

alter table public.solar_system_calculations
  add column if not exists calculation_version integer,
  add column if not exists discounted_payback_years numeric,
  add column if not exists discounted_payback_months integer,
  add column if not exists net_present_value numeric,
  add column if not exists internal_rate_of_return_percent numeric,
  add column if not exists first_year_net_cash_flow numeric,
  add column if not exists projection_years integer,
  add column if not exists projected_gross_savings numeric,
  add column if not exists projected_net_savings numeric,
  add column if not exists regulatory_framework text,
  add column if not exists financial_status text,
  add column if not exists financial_status_label text;

comment on column public.solar_system_calculations.calculation_version is
  'Versão do motor financeiro que originou o snapshot persistido.';
comment on column public.solar_system_calculations.discounted_payback_years is
  'Payback descontado calculado pelo fluxo de caixa mensal.';
comment on column public.solar_system_calculations.net_present_value is
  'Valor presente líquido no horizonte configurado na proposta.';
comment on column public.solar_system_calculations.projected_net_savings is
  'Saldo nominal final após investimento, O&M e reposições informadas.';

create or replace function public.sync_proposal_solar_calculation(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
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
  v_discounted_payback_years numeric;
  v_discounted_payback_months integer;
  v_display_payback_months integer;
  v_payback_formatted text;
  v_module_power_w numeric;
  v_panel_count integer;
  v_inverter_power_kw numeric;
  v_required_power_kwp numeric;
  v_excess_kwh numeric;
  v_excess_percentage numeric;
  v_tariffs_percent numeric;
  v_snapshot jsonb;
  v_snapshot_version integer;
  v_net_present_value numeric;
  v_internal_rate_of_return_percent numeric;
  v_first_year_net_cash_flow numeric;
  v_projection_years integer;
  v_projected_gross_savings numeric;
  v_projected_net_savings numeric;
  v_regulatory_framework text;
  v_financial_status text;
  v_financial_status_label text;
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
  v_snapshot := p.flow_state #> '{paybackForm,calculationSnapshot}';
  v_snapshot_version := coalesce(public.safe_numeric_text(v_snapshot ->> 'calculationVersion'), 0)::integer;

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

  v_effective_tariff := case
    when p.flow_state #>> '{paybackForm,tariffTaxMode}' = 'already_included'
      then p.energy_tariff
    else p.energy_tariff * (1 + v_tariffs_percent / 100)
  end;

  if v_snapshot_version >= 1 then
    v_effective_tariff := coalesce(
      public.safe_numeric_text(v_snapshot ->> 'effectiveTariffPerKwh'),
      v_effective_tariff
    );
    v_monthly_savings := public.safe_numeric_text(v_snapshot ->> 'monthlySavings');
    v_annual_savings := public.safe_numeric_text(v_snapshot ->> 'annualSavings');
    v_first_year_net_cash_flow := public.safe_numeric_text(v_snapshot ->> 'firstYearNetCashFlow');
    v_payback_years := public.safe_numeric_text(v_snapshot ->> 'paybackYears');
    v_payback_months := public.safe_numeric_text(v_snapshot ->> 'paybackMonths')::integer;
    v_discounted_payback_years := public.safe_numeric_text(v_snapshot ->> 'discountedPaybackYears');
    v_discounted_payback_months := public.safe_numeric_text(v_snapshot ->> 'discountedPaybackMonths')::integer;
    v_net_present_value := public.safe_numeric_text(v_snapshot ->> 'netPresentValue');
    v_internal_rate_of_return_percent := public.safe_numeric_text(v_snapshot ->> 'internalRateOfReturnPercent');
    v_projection_years := coalesce(public.safe_numeric_text(v_snapshot ->> 'projectionYears'), 25)::integer;
    v_projected_gross_savings := public.safe_numeric_text(v_snapshot ->> 'projectedGrossSavings');
    v_projected_net_savings := public.safe_numeric_text(v_snapshot ->> 'projectedNetSavings');
    v_regulatory_framework := nullif(v_snapshot ->> 'regulatoryFramework', '');
    v_financial_status := nullif(v_snapshot ->> 'status', '');
    v_financial_status_label := nullif(v_snapshot ->> 'statusLabel', '');
  else
    -- Compatibilidade para propostas concluídas sem snapshot do motor financeiro.
    v_monthly_savings := round(least(v_compensable_kwh, v_estimated_generation_kwh) * v_effective_tariff, 2);
    v_annual_savings := round(v_monthly_savings * 12, 2);
    v_first_year_net_cash_flow := v_annual_savings;
    v_payback_years := case when v_annual_savings > 0 then p.final_price / v_annual_savings else null end;
    v_payback_months := case when v_payback_years is not null then ceil(v_payback_years * 12)::integer else null end;
    v_discounted_payback_years := null;
    v_discounted_payback_months := null;
    v_net_present_value := null;
    v_internal_rate_of_return_percent := null;
    v_projection_years := 25;
    v_projected_gross_savings := round(v_annual_savings * 25, 2);
    v_projected_net_savings := round(v_projected_gross_savings - p.final_price, 2);
    v_regulatory_framework := 'legacy_simple';
    v_financial_status := null;
    v_financial_status_label := null;
  end if;

  if v_monthly_savings is null or v_annual_savings is null then
    return;
  end if;

  v_display_payback_months := coalesce(v_discounted_payback_months, v_payback_months);
  v_payback_formatted := case
    when v_display_payback_months is null then
      format('Não recuperado em %s anos', coalesce(v_projection_years, 25))
    else
      case
        when (v_display_payback_months / 12) > 0 and (v_display_payback_months % 12) > 0 then
          format(
            '%s %s e %s %s',
            v_display_payback_months / 12,
            case when (v_display_payback_months / 12) = 1 then 'ano' else 'anos' end,
            v_display_payback_months % 12,
            case when (v_display_payback_months % 12) = 1 then 'mês' else 'meses' end
          )
        when (v_display_payback_months / 12) > 0 then
          format(
            '%s %s',
            v_display_payback_months / 12,
            case when (v_display_payback_months / 12) = 1 then 'ano' else 'anos' end
          )
        else
          format(
            '%s %s',
            v_display_payback_months,
            case when v_display_payback_months = 1 then 'mês' else 'meses' end
          )
      end
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
    calculation_version,
    discounted_payback_years,
    discounted_payback_months,
    net_present_value,
    internal_rate_of_return_percent,
    first_year_net_cash_flow,
    projection_years,
    projected_gross_savings,
    projected_net_savings,
    regulatory_framework,
    financial_status,
    financial_status_label,
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
    round(v_monthly_savings, 2),
    round(v_annual_savings, 2),
    round(v_payback_years, 2),
    v_payback_months,
    v_payback_formatted,
    case when v_projection_years = 25 then round(v_projected_gross_savings, 2) else null end,
    case when v_projection_years = 25 then round(v_projected_net_savings, 2) else null end,
    v_snapshot_version,
    round(v_discounted_payback_years, 2),
    v_discounted_payback_months,
    round(v_net_present_value, 2),
    round(v_internal_rate_of_return_percent, 2),
    round(v_first_year_net_cash_flow, 2),
    v_projection_years,
    round(v_projected_gross_savings, 2),
    round(v_projected_net_savings, 2),
    v_regulatory_framework,
    v_financial_status,
    v_financial_status_label,
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
    calculation_version = excluded.calculation_version,
    discounted_payback_years = excluded.discounted_payback_years,
    discounted_payback_months = excluded.discounted_payback_months,
    net_present_value = excluded.net_present_value,
    internal_rate_of_return_percent = excluded.internal_rate_of_return_percent,
    first_year_net_cash_flow = excluded.first_year_net_cash_flow,
    projection_years = excluded.projection_years,
    projected_gross_savings = excluded.projected_gross_savings,
    projected_net_savings = excluded.projected_net_savings,
    regulatory_framework = excluded.regulatory_framework,
    financial_status = excluded.financial_status,
    financial_status_label = excluded.financial_status_label,
    updated_at = now();
end;
$$;

revoke all on function public.sync_proposal_solar_calculation(uuid) from public, anon, authenticated;

-- Atualiza propostas concluídas. Propostas antigas continuam usando o fallback simples;
-- propostas com snapshot passam a usar o cálculo financeiro salvo no flow_state.
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
