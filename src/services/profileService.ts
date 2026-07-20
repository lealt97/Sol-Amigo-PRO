import { supabase } from '../lib/supabase/client';
import { Profile } from '../types/profile';
import {
  assertAccountLogoLimit,
  extractAllLogos,
  MAX_ACCOUNT_LOGOS,
} from '../utils/logoHelper';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '-');
const PROFILE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const PROFILE_AVATAR_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

function resolveProfileAvatarPath(value: string, userId: string) {
  const publicMarker = '/storage/v1/object/public/logos/';
  const rawPath = value.includes(publicMarker)
    ? value.split(publicMarker)[1]?.split('?')[0] || ''
    : value;
  const path = decodeURIComponent(rawPath);

  if (!path.startsWith(`${userId}/avatars/`)) {
    throw new Error('A foto informada não pertence a esta conta.');
  }

  return path;
}

async function assertLogoUploadAvailable(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('logo_url')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  const currentLogos = extractAllLogos(data?.logo_url || null);
  if (currentLogos.length >= MAX_ACCOUNT_LOGOS) {
    throw new Error(`Você pode cadastrar no máximo ${MAX_ACCOUNT_LOGOS} logos. Exclua um logo para enviar outro.`);
  }
}

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const defaultProfile = {
        id: userId,
        name: '',
        company_name: '',
      };

      const { data: newData, error: insertError } = await supabase
        .from('profiles')
        .insert([defaultProfile])
        .select()
        .single();

      if (insertError) {
        console.warn('Could not create default profile, returning empty object:', insertError);
        return defaultProfile as Profile;
      }
      return newData as Profile;
    }

    return data as Profile;
  },

  async updateProfile(userId: string, profileData: Partial<Profile>) {
    if (Object.prototype.hasOwnProperty.call(profileData, 'logo_url')) {
      assertAccountLogoLimit(extractAllLogos(profileData.logo_url || null));
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async uploadProfileAvatar(file: File, userId: string) {
    const extension = PROFILE_AVATAR_TYPES.get(file.type);
    if (!extension) {
      throw new Error('Envie uma foto em PNG, JPG ou WebP.');
    }

    if (file.size > PROFILE_AVATAR_MAX_BYTES) {
      throw new Error('A foto de perfil deve ter no máximo 2 MB.');
    }

    const filePath = `${userId}/avatars/profile-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath);

    return { url: data.publicUrl, path: filePath };
  },

  async deleteProfileAvatar(avatarUrlOrPath: string, userId: string) {
    const filePath = resolveProfileAvatarPath(avatarUrlOrPath, userId);
    const { error } = await supabase.storage.from('logos').remove([filePath]);
    if (error) throw error;
  },

  async uploadLogo(file: File, userId: string) {
    // Validate before creating a Storage object so a fourth upload cannot leave
    // an orphaned file when the account has already reached its logo quota.
    await assertLogoUploadAvailable(userId);

    const safeName = sanitizeFileName(file.name || 'logo');
    const filePath = `${userId}/logos/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async uploadSellerSignature(file: File, userId: string) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    const isAllowed = allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.svg');

    if (!isAllowed) {
      throw new Error('Envie uma assinatura em PNG, JPG ou SVG.');
    }

    const safeName = sanitizeFileName(file.name);
    const filePath = `${userId}/seller-signatures/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        contentType: file.type || (file.name.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/png'),
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },
};
