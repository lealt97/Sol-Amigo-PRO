import { supabase } from '../lib/supabase/client';
import { Profile } from '../types/profile';

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '-');

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
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async uploadLogo(file: File, userId: string) {
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
