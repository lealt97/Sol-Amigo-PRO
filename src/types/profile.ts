import { PlatformThemeConfig } from '../lib/theme/platformTheme';

export interface Profile {
  id: string;
  name: string;
  company_name: string;
  phone: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  role: string | null;
  mfa_enabled: boolean;
  document: string | null;
  company_email: string | null;
  website: string | null;
  cep: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  seller_name: string | null;
  seller_phone: string | null;
  seller_email: string | null;
  seller_signature_url: string | null;
  platform_theme: PlatformThemeConfig | null;
  default_margin_percentage: number | null;
  default_validity_days: number | null;
  created_at?: string;
  updated_at?: string;
}