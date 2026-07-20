import { supabase } from '../lib/supabase/client';

export type PlatformAdminRole = 'support' | 'operations' | 'super_admin';

export interface AdminAccountSummary {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  blocked: boolean;
  banned_until: string | null;
  profile: {
    id: string;
    name: string | null;
    company_name: string | null;
    phone: string | null;
    company_email: string | null;
    created_at: string | null;
  } | null;
  subscription: Record<string, unknown> | null;
  usage: Record<string, unknown> | null;
}

async function invokeAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-console', { body });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export const adminService = {
  getMe() {
    return invokeAdmin<{ authorized: true; role: PlatformAdminRole }>({ action: 'me' });
  },

  listAccounts(input: { page?: number; perPage?: number; search?: string } = {}) {
    return invokeAdmin<{
      accounts: AdminAccountSummary[];
      page: number;
      per_page: number;
      total: number;
    }>({
      action: 'list_accounts',
      page: input.page || 1,
      perPage: input.perPage || 25,
      search: input.search || '',
    });
  },

  getAccountDetail(accountId: string) {
    return invokeAdmin<Record<string, unknown>>({ action: 'account_detail', accountId });
  },

  blockAccount(accountId: string, reason: string) {
    return invokeAdmin<{ success: true; blocked: true }>({ action: 'block_account', accountId, reason });
  },

  reactivateAccount(accountId: string, reason: string) {
    return invokeAdmin<{ success: true; blocked: false }>({ action: 'reactivate_account', accountId, reason });
  },

  listEvents(severity?: 'info' | 'warning' | 'error' | 'critical') {
    return invokeAdmin<{ events: Array<Record<string, unknown>> }>({ action: 'list_events', severity });
  },

  listBetaFeedback() {
    return invokeAdmin<{ feedback: Array<Record<string, unknown>> }>({ action: 'list_beta_feedback' });
  },
};
