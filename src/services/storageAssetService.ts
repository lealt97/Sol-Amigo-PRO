import { supabase } from '../lib/supabase/client';

const ALLOWED_PUBLIC_ASSET_BUCKETS = ['logos', 'pdf-assets'] as const;
type PublicAssetBucket = typeof ALLOWED_PUBLIC_ASSET_BUCKETS[number];

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '-');

export const storageAssetService = {
  async uploadAsset(file: File, bucket: PublicAssetBucket, userId: string): Promise<string> {
    if (!ALLOWED_PUBLIC_ASSET_BUCKETS.includes(bucket)) {
      throw new Error('Bucket de upload não permitido.');
    }

    if (!userId) {
      throw new Error('Usuário não autenticado.');
    }

    const safeName = sanitizeFileName(file.name || 'asset');
    const filePath = `${userId}/models/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },
};
