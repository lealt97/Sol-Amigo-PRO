import { supabase } from '../lib/supabase/client';
import {
  assertPrivateRasterImage,
  createStorageReference,
  parseStorageReference,
  resolveStorageAssetUrl,
  type StorageAssetBucket,
} from '../lib/storage/privateAsset';

const ALLOWED_DESIGN_ASSET_BUCKETS = ['logos', 'pdf-assets'] as const;
type DesignAssetBucket = typeof ALLOWED_DESIGN_ASSET_BUCKETS[number];

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9_.-]/g, '-');
const sanitizeFolder = (folder: string) => folder
  .split('/')
  .map((segment) => sanitizeFileName(segment))
  .filter(Boolean)
  .join('/');

async function uploadImage(
  file: File,
  bucket: StorageAssetBucket,
  userId: string,
  folder: string,
): Promise<string> {
  if (!userId) throw new Error('Usuário não autenticado.');
  assertPrivateRasterImage(file, bucket === 'proposals' ? 'uma foto do telhado' : 'uma imagem');

  const safeName = sanitizeFileName(file.name || 'asset');
  const safeFolder = sanitizeFolder(folder) || 'assets';
  const filePath = `${userId}/${safeFolder}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: file.type || undefined,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  if (bucket === 'pdf-assets' || bucket === 'proposals') {
    return createStorageReference(bucket, filePath);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

export const storageAssetService = {
  async uploadAsset(file: File, bucket: DesignAssetBucket, userId: string): Promise<string> {
    if (!ALLOWED_DESIGN_ASSET_BUCKETS.includes(bucket)) {
      throw new Error('Bucket de upload não permitido.');
    }

    return uploadImage(file, bucket, userId, 'models');
  },

  async removeAsset(value: string, bucket: DesignAssetBucket, userId: string): Promise<void> {
    if (!userId) throw new Error('Usuário não autenticado.');
    if (!ALLOWED_DESIGN_ASSET_BUCKETS.includes(bucket)) {
      throw new Error('Bucket de exclusão não permitido.');
    }

    const reference = parseStorageReference(value);

    // URLs legadas ou externas podem ser retiradas do modelo sem tentar excluir
    // um arquivo que não pertence ao storage privado atual.
    if (!reference) return;

    const allowedPrefix = `${userId}/models/`;
    if (reference.bucket !== bucket || !reference.path.startsWith(allowedPrefix)) {
      throw new Error('Referência do arquivo do modelo inválida.');
    }

    const { error } = await supabase.storage.from(bucket).remove([reference.path]);
    if (error) throw error;
  },

  async uploadRoofImage(file: File, userId: string): Promise<string> {
    return uploadImage(file, 'proposals', userId, 'roof-photos');
  },

  async removeRoofImage(value: string, userId: string): Promise<void> {
    if (!userId) throw new Error('Usuário não autenticado.');

    const reference = parseStorageReference(value);
    const allowedPrefix = `${userId}/roof-photos/`;
    if (!reference || reference.bucket !== 'proposals' || !reference.path.startsWith(allowedPrefix)) {
      throw new Error('Referência da foto do telhado inválida.');
    }

    const { error } = await supabase.storage.from('proposals').remove([reference.path]);
    if (error) throw error;
  },

  resolveAssetUrl(value: string | null | undefined, expiresInSeconds?: number) {
    return resolveStorageAssetUrl(value, expiresInSeconds);
  },
};