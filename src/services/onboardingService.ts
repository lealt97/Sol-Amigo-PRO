import { supabase } from '../lib/supabase/client';

export interface OnboardingStatus {
  company_complete: boolean;
  logo_complete: boolean;
  kit_complete: boolean;
  client_complete: boolean;
  completed_steps: number;
  total_steps: number;
  complete: boolean;
}

export const onboardingService = {
  async getStatus(): Promise<OnboardingStatus> {
    const { data, error } = await supabase.rpc('get_my_onboarding_status');
    if (error) throw error;
    return {
      company_complete: data?.company_complete === true,
      logo_complete: data?.logo_complete === true,
      kit_complete: data?.kit_complete === true,
      client_complete: data?.client_complete === true,
      completed_steps: Number(data?.completed_steps || 0),
      total_steps: Number(data?.total_steps || 4),
      complete: data?.complete === true,
    };
  },
};
