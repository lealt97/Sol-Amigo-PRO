import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types/profile';
import { MAX_ACCOUNT_LOGOS, extractAllLogos } from '../utils/logoHelper';
import { supabase } from '../lib/supabase/client';
import { legalService, type LegalStatus } from './legalService';
import { profileService } from './profileService';

export const FIRST_USE_VERSION = 2;

export type FirstUseStatus = {
  company_complete: boolean;
  responsible_complete: boolean;
  identity_complete: boolean;
  legal_complete: boolean;
  completed_steps: number;
  total_steps: number;
  complete: boolean;
};

export type FirstUseSnapshot = {
  profile: Profile;
  legalStatus: LegalStatus;
  status: FirstUseStatus;
  logoSkipped: boolean;
};

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

function buildStatus(profile: Profile, legalStatus: LegalStatus, _logoSkipped = false): FirstUseStatus {
  const companyComplete = Boolean(
    hasText(profile.company_name)
      && (hasText(profile.phone) || hasText(profile.company_email))
      && hasText(profile.city)
      && hasText(profile.state),
  );

  const responsibleComplete = Boolean(
    (hasText(profile.seller_name) || hasText(profile.name))
      && (hasText(profile.seller_phone) || hasText(profile.seller_email)),
  );

  const identityComplete = extractAllLogos(profile.logo_url).length === MAX_ACCOUNT_LOGOS;
  const legalComplete = legalStatus.complete;
  const flags = [companyComplete, responsibleComplete, identityComplete, legalComplete];
  const completedSteps = flags.filter(Boolean).length;

  return {
    company_complete: companyComplete,
    responsible_complete: responsibleComplete,
    identity_complete: identityComplete,
    legal_complete: legalComplete,
    completed_steps: completedSteps,
    total_steps: flags.length,
    complete: completedSteps === flags.length,
  };
}

function metadataBoolean(user: User, key: string) {
  return user.user_metadata?.[key] === true;
}

export const firstUseService = {
  requiresFirstUse(user: User) {
    const completedAt = user.user_metadata?.first_use_completed_at;
    const completedVersion = Number(user.user_metadata?.first_use_version || 0);

    return !completedAt || completedVersion < FIRST_USE_VERSION;
  },

  async load(user: User): Promise<FirstUseSnapshot> {
    const [profile, legalStatus] = await Promise.all([
      profileService.getProfile(user.id),
      legalService.getMyStatus(),
    ]);
    const logoSkipped = metadataBoolean(user, 'first_use_logo_skipped');

    return {
      profile,
      legalStatus,
      logoSkipped,
      status: buildStatus(profile, legalStatus, logoSkipped),
    };
  },

  buildStatus,

  async setLogoSkipped(skipped: boolean) {
    const { data, error } = await supabase.auth.updateUser({
      data: { first_use_logo_skipped: skipped },
    });
    if (error) throw error;
    return data.user;
  },

  async complete(status: FirstUseStatus) {
    if (!status.complete) {
      throw new Error('Conclua todas as etapas obrigatórias antes de acessar a plataforma.');
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        first_use_completed_at: new Date().toISOString(),
        first_use_version: FIRST_USE_VERSION,
      },
    });
    if (error) throw error;
    return data.user;
  },
};
