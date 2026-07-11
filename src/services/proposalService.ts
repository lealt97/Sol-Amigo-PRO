import { supabase } from '../lib/supabase/client';
import { proposalEventService } from './proposalEventService';
import { Proposal } from '../types/proposal';
import { ProposalFormValues } from '../lib/validations/proposal.schema';
import { calcularSistemaSolar } from '../lib/calculations/solar';

import { calcularPrecoProposta } from '../lib/calculations/pricing';

const formatNumber = (val: any) => {
  if (val === '' || val === null || val === undefined) return null;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : null;
};

const getAdditionalCostsTotal = (proposal: Partial<ProposalFormValues>) => {
  return (proposal.additional_costs || []).reduce((sum, cost) => {
    const amount = formatNumber(cost.amount) || 0;
    return sum + Math.max(0, amount);
  }, 0);
};

const resolveOtherCosts = (proposal: Partial<ProposalFormValues>) => {
  const additionalCostsTotal = getAdditionalCostsTotal(proposal);
  if (additionalCostsTotal > 0) return Number(additionalCostsTotal.toFixed(2));
  return formatNumber(proposal.other_costs) || 0;
};

export const proposalService = {
  async getProposals() {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, client:clients(name, document, email, phone), profile:profiles(company_name, logo_url, seller_name, seller_phone, seller_email, website, company_email, default_validity_days, default_margin_percentage)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Proposal[];
  },

  async getProposalById(id: string) {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, client:clients(name, document, email, phone), solar:solar_system_calculations(*), loads:proposal_loads(*), profile:profiles(company_name, logo_url, seller_name, seller_phone, seller_email, website, company_email, default_validity_days, default_margin_percentage)')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    
    if (data && data.solar && data.solar.length > 0) {
      data.solar = data.solar[0];
    } else {
      data.solar = null;
    }
    
    
    
    return data as Proposal;
  },

  async createProposal(proposal: ProposalFormValues, userId: string, isDuplicate = false) {
    const otherCosts = resolveOtherCosts(proposal);
    const pricing = calcularPrecoProposta({
      kit_cost: formatNumber(proposal.kit_cost) || 0,
      labor_cost: formatNumber(proposal.labor_cost) || 0,
      fixed_costs: formatNumber(proposal.fixed_costs) || 0,
      freight_cost: formatNumber(proposal.freight_cost) || 0,
      taxes: formatNumber(proposal.taxes) || 0,
      commission: formatNumber(proposal.commission) || 0,
      other_costs: otherCosts,
      margin_percentage: formatNumber(proposal.margin_percentage) || 0,
      discount_percentage: formatNumber(proposal.discount_percentage) || 0,
    });

    const formattedData = {
      user_id: userId,
      client_id: proposal.client_id,
      title: proposal.title || 'Nova Proposta',
      status: 'draft',
      consumption_source: proposal.consumption_source,
      
      estimated_daily_consumption: formatNumber(proposal.estimated_daily_consumption),
      monthly_consumption_kwh: formatNumber(proposal.monthly_consumption_kwh),
      bill_amount: formatNumber(proposal.bill_amount),
      kit_cost: formatNumber(proposal.kit_cost),
      labor_cost: formatNumber(proposal.labor_cost),
      fixed_costs: formatNumber(proposal.fixed_costs),
      freight_cost: formatNumber(proposal.freight_cost),
      taxes: formatNumber(proposal.taxes),
      commission: formatNumber(proposal.commission),
      other_costs: otherCosts || null,
      margin_percentage: formatNumber(proposal.margin_percentage),
      discount_percentage: formatNumber(proposal.discount_percentage),
      energy_tariff: formatNumber(proposal.energy_tariff),
      total_cost: pricing.total_cost,
      gross_price: pricing.gross_price,
      discount_value: pricing.discount_value,
      final_price: pricing.final_price,
      estimated_profit: pricing.estimated_profit,
      real_margin_percentage: pricing.real_margin_percentage,
      markup_percentage: pricing.markup_percentage,
    };

    const { data, error } = await supabase
      .from('proposals')
      .insert([formattedData])
      .select()
      .single();
      
    if (error) throw error;
    
    // Calcula e salva os dados solares
    await this.upsertSolarCalculation(data.id, proposal, pricing.final_price);
    
    if (proposal.loads) {
      await this.upsertLoads(data.id, proposal.loads);
    }
    
    await proposalEventService.logEvent(
      data.id, 
      isDuplicate ? 'duplicated' : 'created', 
      isDuplicate ? 'Proposta duplicada' : 'Proposta criada'
    );
                
    return data as Proposal;
  },

  async updateProposal(id: string, proposal: Partial<ProposalFormValues>) {
    const otherCosts = resolveOtherCosts(proposal);
    const pricing = calcularPrecoProposta({
      kit_cost: proposal.kit_cost !== undefined ? formatNumber(proposal.kit_cost) || 0 : 0,
      labor_cost: proposal.labor_cost !== undefined ? formatNumber(proposal.labor_cost) || 0 : 0,
      fixed_costs: proposal.fixed_costs !== undefined ? formatNumber(proposal.fixed_costs) || 0 : 0,
      freight_cost: proposal.freight_cost !== undefined ? formatNumber(proposal.freight_cost) || 0 : 0,
      taxes: proposal.taxes !== undefined ? formatNumber(proposal.taxes) || 0 : 0,
      commission: proposal.commission !== undefined ? formatNumber(proposal.commission) || 0 : 0,
      other_costs: otherCosts,
      margin_percentage: proposal.margin_percentage !== undefined ? formatNumber(proposal.margin_percentage) || 0 : 0,
      discount_percentage: proposal.discount_percentage !== undefined ? formatNumber(proposal.discount_percentage) || 0 : 0,
    });
    
    // Note: To calculate correctly in updates, we'd need the existing values if partial is passed, 
    // but the frontend wizard passes all form values on save.
    // For safety, assuming the frontend provides the entire form values.
    
    const formattedData: any = {};
    if (proposal.client_id !== undefined) formattedData.client_id = proposal.client_id;
    if (proposal.title !== undefined) formattedData.title = proposal.title;
    if (proposal.consumption_source !== undefined) formattedData.consumption_source = proposal.consumption_source;
    
    if (proposal.estimated_daily_consumption !== undefined) formattedData.estimated_daily_consumption = formatNumber(proposal.estimated_daily_consumption);
    if (proposal.monthly_consumption_kwh !== undefined) formattedData.monthly_consumption_kwh = formatNumber(proposal.monthly_consumption_kwh);
    if (proposal.bill_amount !== undefined) formattedData.bill_amount = formatNumber(proposal.bill_amount);
    if (proposal.kit_cost !== undefined) formattedData.kit_cost = formatNumber(proposal.kit_cost);
    if (proposal.labor_cost !== undefined) formattedData.labor_cost = formatNumber(proposal.labor_cost);
    if (proposal.fixed_costs !== undefined) formattedData.fixed_costs = formatNumber(proposal.fixed_costs);
    if (proposal.freight_cost !== undefined) formattedData.freight_cost = formatNumber(proposal.freight_cost);
    if (proposal.taxes !== undefined) formattedData.taxes = formatNumber(proposal.taxes);
    if (proposal.commission !== undefined) formattedData.commission = formatNumber(proposal.commission);
    if (proposal.other_costs !== undefined || proposal.additional_costs !== undefined) formattedData.other_costs = otherCosts || null;
    if (proposal.margin_percentage !== undefined) formattedData.margin_percentage = formatNumber(proposal.margin_percentage);
    if (proposal.discount_percentage !== undefined) formattedData.discount_percentage = formatNumber(proposal.discount_percentage);
    if (proposal.energy_tariff !== undefined) formattedData.energy_tariff = formatNumber(proposal.energy_tariff);

    // Only update pricing if any cost/margin changed
    if (
      proposal.kit_cost !== undefined || proposal.labor_cost !== undefined || 
      proposal.fixed_costs !== undefined || proposal.freight_cost !== undefined || 
      proposal.taxes !== undefined || proposal.commission !== undefined || 
      proposal.other_costs !== undefined || proposal.additional_costs !== undefined ||
      proposal.margin_percentage !== undefined || 
      proposal.discount_percentage !== undefined
    ) {
      formattedData.total_cost = pricing.total_cost;
      formattedData.gross_price = pricing.gross_price;
      formattedData.discount_value = pricing.discount_value;
      formattedData.final_price = pricing.final_price;
      formattedData.estimated_profit = pricing.estimated_profit;
      formattedData.real_margin_percentage = pricing.real_margin_percentage;
      formattedData.markup_percentage = pricing.markup_percentage;
    }

    const { data, error } = await supabase
      .from('proposals')
      .update(formattedData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    
    await this.upsertSolarCalculation(id, proposal, pricing.final_price);
    
    if (proposal.loads) {
      await this.upsertLoads(id, proposal.loads);
    }
    await proposalEventService.logEvent(id, 'updated', 'Proposta atualizada');
    
    
    
    return data as Proposal;
  },

  async upsertSolarCalculation(proposalId: string, proposal: Partial<ProposalFormValues>, finalPrice: number) {
    const calc = calcularSistemaSolar({
      hsp: formatNumber(proposal.hsp) || 0,
      panel_power_w: formatNumber(proposal.panel_power_w) || 0,
      yield_factor: formatNumber(proposal.yield_factor) || 0.80,
      generation_target_percent: formatNumber(proposal.generation_target_percent) || 100,
      oversizing: formatNumber(proposal.oversizing) || 1.20,
      monthly_consumption_kwh: formatNumber(proposal.monthly_consumption_kwh) || undefined,
      current_bill_value: formatNumber(proposal.bill_amount) || undefined,
      energy_tariff: formatNumber(proposal.energy_tariff) || undefined,
    });
    
    let paybackData = {};
    if (calc) {
      const { calcularPayback } = await import('../lib/calculations/payback');
      const payback = calcularPayback({
        investimentoTotal: finalPrice,
        economiaMensal: calc.monthly_savings,
        economiaAnual: calc.annual_savings,
      });

      if (payback) {
        paybackData = {
          payback_years: payback.paybackAnos,
          payback_months: payback.paybackMeses,
          payback_formatted: payback.paybackFormatado,
          return_25_years: payback.retorno25Anos,
          net_savings_25_years: payback.economiaLiquida25Anos,
        };
      }
    }
    
    const solarData = {
      proposal_id: proposalId,
      cep: proposal.cep || null,
      hsp: formatNumber(proposal.hsp),
      panel_power_w: formatNumber(proposal.panel_power_w),
      yield_factor: formatNumber(proposal.yield_factor) || 0.80,
      generation_target_percent: formatNumber(proposal.generation_target_percent) || 100,
      oversizing: formatNumber(proposal.oversizing) || 1.20,
      ...(calc ? {
        monthly_consumption_kwh: calc.monthly_consumption_kwh,
        projected_consumption_kwh: calc.projected_consumption_kwh,
        required_power_kwp: calc.required_power_kwp,
        panel_count: calc.panel_count,
        installed_power_kwp: calc.installed_power_kwp,
        estimated_monthly_generation_kwh: calc.estimated_monthly_generation_kwh,
        excess_kwh: calc.excess_kwh,
        excess_percentage: calc.excess_percentage,
        min_inverter_power_kw: calc.min_inverter_power_kw,
        current_bill_value: calc.energy_tariff * calc.monthly_consumption_kwh,
        energy_tariff: calc.energy_tariff,
        monthly_savings: calc.monthly_savings,
        annual_savings: calc.annual_savings,
        ...paybackData
      } : {})
    };

    // check if it exists
    const { data: existing } = await supabase
      .from('solar_system_calculations')
      .select('id')
      .eq('proposal_id', proposalId)
      .single();

    if (existing) {
      await supabase
        .from('solar_system_calculations')
        .update(solarData)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('solar_system_calculations')
        .insert([solarData]);
    }
  },

  async upsertLoads(proposalId: string, loads: any[]) {
    // Delete existing loads first to ensure a clean state
    await supabase.from('proposal_loads').delete().eq('proposal_id', proposalId);
    
    if (loads.length > 0) {
      const loadsData = loads.map(load => ({
        proposal_id: proposalId,
        equipment_name: load.equipment_name,
        power_watts: formatNumber(load.power_watts) || 0,
        quantity: formatNumber(load.quantity) || 0,
        hours_per_day: formatNumber(load.hours_per_day) || 0,
        daily_consumption: formatNumber(load.daily_consumption) || 0,
      }));
      
      await supabase.from('proposal_loads').insert(loadsData);
    }
  },

  async deleteProposal(id: string) {
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
