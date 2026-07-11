import { z } from 'zod';

export const proposalSchema = z.object({
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  title: z.string().optional().or(z.literal('')),
  
  // Consumo
  consumption_source: z.string().optional().or(z.literal('')),
  monthly_consumption_kwh: z.union([z.string(), z.number()]).optional(),
  bill_amount: z.union([z.string(), z.number()]).optional(),
  estimated_daily_consumption: z.union([z.string(), z.number()]).optional(),
  history: z.array(z.union([z.string(), z.number()])).optional(),
  loads: z.array(z.object({
    id: z.string().optional(),
    equipment_name: z.string().min(1, 'Nome do equipamento é obrigatório'),
    power_watts: z.union([z.string(), z.number()]),
    quantity: z.union([z.string(), z.number()]),
    hours_per_day: z.union([z.string(), z.number()]),
    daily_consumption: z.union([z.string(), z.number()]).optional(),
  })).optional(),
  
  // Projeto Solar
  cep: z.string().optional().or(z.literal('')),
  hsp: z.union([z.string(), z.number()]).optional(),
  panel_power_w: z.union([z.string(), z.number()]).optional(),
  yield_factor: z.union([z.string(), z.number()]).optional(),
  generation_target_percent: z.union([z.string(), z.number()]).optional(),
  oversizing: z.union([z.string(), z.number()]).optional(),
  energy_tariff: z.union([z.string(), z.number()]).optional(),
  
  // Custos
  kit_cost: z.union([z.string(), z.number()]).optional(),
  labor_cost: z.union([z.string(), z.number()]).optional(),
  fixed_costs: z.union([z.string(), z.number()]).optional(),
  freight_cost: z.union([z.string(), z.number()]).optional(),
  taxes: z.union([z.string(), z.number()]).optional(),
  commission: z.union([z.string(), z.number()]).optional(),
  other_costs: z.union([z.string(), z.number()]).optional(),
  additional_costs: z.array(z.object({
    id: z.string().optional(),
    description: z.string().optional().or(z.literal('')),
    amount: z.union([z.string(), z.number()]).optional(),
  })).optional(),
  margin_percentage: z.union([z.string(), z.number()]).optional(),
  discount_percentage: z.union([z.string(), z.number()]).optional(),
});

export type ProposalFormValues = z.infer<typeof proposalSchema>;
