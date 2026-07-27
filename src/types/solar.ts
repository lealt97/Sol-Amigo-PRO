export interface SolarSystemCalculation {
  id: string;
  proposal_id: string;
  cep: string | null;
  hsp: number | null;
  panel_power_w: number | null;
  yield_factor: number;
  generation_target_percent: number;
  monthly_consumption_kwh: number | null;
  projected_consumption_kwh: number | null;
  required_power_kwp: number | null;
  panel_count: number | null;
  installed_power_kwp: number | null;
  estimated_monthly_generation_kwh: number | null;
  excess_kwh: number | null;
  excess_percentage: number | null;
  min_inverter_power_kw: number | null;
  current_bill_value: number | null;
  energy_tariff: number | null;
  monthly_savings: number | null;
  annual_savings: number | null;
  payback_years: number | null;
  payback_months: number | null;
  payback_formatted: string | null;
  return_25_years: number | null;
  net_savings_25_years: number | null;
  created_at: string;
  updated_at: string;
}

export interface SolarCalculationInput {
  cep?: string | null;
  hsp: number;
  panel_power_w: number;
  yield_factor: number; // e.g. 0.80
  generation_target_percent: number; // e.g. 100
  monthly_consumption_kwh?: number;
  current_bill_value?: number;
  energy_tariff?: number;
}

export interface SolarCalculationResult {
  monthly_consumption_kwh: number;
  projected_consumption_kwh: number;
  required_power_kwp: number;
  panel_count: number;
  installed_power_kwp: number;
  estimated_monthly_generation_kwh: number;
  excess_kwh: number;
  excess_percentage: number;
  min_inverter_power_kw: number;
  monthly_savings: number;
  annual_savings: number;
  energy_tariff: number;
}
