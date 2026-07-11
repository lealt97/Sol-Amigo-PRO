import { SolarSystemCalculation } from './solar';
import { ProposalLoad } from './loadSurvey';
import { RoofLayoutData } from './roofLayout';

export interface Proposal {
  id: string;
  user_id: string;
  client_id: string;
  code: string | null;
  title: string | null;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'pending' | 'approved' | 'expired';
  consumption_source: 'average' | 'historical' | 'load_survey' | null;
  estimated_daily_consumption: number | null;
  monthly_consumption_kwh: number | null;
  bill_amount: number | null;
  energy_tariff: number | null;
  roof_type?: string | null;
  roof_area_m2?: number | null;
  roof_image_url?: string | null;
  roof_photo_url?: string | null;
  roof_plan_image_url?: string | null;
  module_width_m?: number | null;
  module_height_m?: number | null;
  roof_layout_json?: RoofLayoutData | null;
  kit_cost: number | null;
  labor_cost: number | null;
  fixed_costs: number | null;
  freight_cost: number | null;
  taxes: number | null;
  commission: number | null;
  other_costs: number | null;
  margin_percentage: number | null;
  discount_percentage: number | null;
  total_cost: number | null;
  gross_price: number | null;
  discount_value: number | null;
  final_price: number | null;
  estimated_profit: number | null;
  real_margin_percentage: number | null;
  markup_percentage: number | null;
  pdf_url: string | null;
  public_token: string | null;
  sent_whatsapp_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  public_viewed_at?: string | null;
  rejection_reason?: string | null;
  client_ip?: string | null;
  client_user_agent?: string | null;
  created_at: string;
  updated_at: string;
  
  // Relações
  client?: {
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
  };
  solar?: SolarSystemCalculation | null;
  loads?: ProposalLoad[];
  profile?: {
    company_name: string;
    logo_url: string | null;
    seller_name: string | null;
    seller_phone: string | null;
    seller_email: string | null;
    website: string | null;
    company_email: string | null;
    default_validity_days: number | null;
    default_margin_percentage: number | null;
  } | null;
}
