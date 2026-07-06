import { PdfTemplatePreset, PdfUserModel, PdfTheme, TransformConfig, PdfPageConfig } from '../types/pdfModels';
import { supabase } from '../lib/supabase/client';
import { A4_PRESETS } from './pdfA4Presets';

const LOCAL_STORAGE_KEY = 'solamigo_pdf_user_models';
const LOCAL_MIGRATION_KEY_PREFIX = 'solamigo_pdf_user_models_migrated_';

const defaultTransform: TransformConfig = { zoom: 1, x: 0, y: 0, rotate: 0 };
const defaultTheme: PdfTheme = { primary: '#0A2249', secondary: '#C49133', accent: '#FACB5C', neutral: '#1F2A2A' };
const defaultPageConfig: PdfPageConfig = {
  order: ['cover', 'intro', 'technical', 'financial', 'payback'],
  visiblePages: {
    cover: true,
    intro: true,
    technical: true,
    financial: true,
    payback: true,
  },
};

export const PRESETS: PdfTemplatePreset[] = A4_PRESETS;

function generateId() {
  return crypto.randomUUID?.() || Math.random().toString(36).substr(2, 9);
}

function clonePageConfig(preset: PdfTemplatePreset): PdfPageConfig {
  return {
    order: [...preset.page_config.order],
    visiblePages: { ...(preset.page_config.visiblePages || {}) },
  };
}

function normalizeTheme(theme?: Partial<PdfTheme> | null): PdfTheme {
  return {
    primary: theme?.primary || defaultTheme.primary,
    secondary: theme?.secondary || defaultTheme.secondary,
    accent: theme?.accent || defaultTheme.accent,
    neutral: theme?.neutral || defaultTheme.neutral,
  };
}

function normalizeTransform(transform?: Partial<TransformConfig> | null): TransformConfig {
  return {
    zoom: Number(transform?.zoom ?? defaultTransform.zoom),
    x: Number(transform?.x ?? defaultTransform.x),
    y: Number(transform?.y ?? defaultTransform.y),
    rotate: Number(transform?.rotate ?? defaultTransform.rotate),
  };
}

function normalizePageConfig(pageConfig?: Partial<PdfPageConfig> | null): PdfPageConfig {
  return {
    order: Array.isArray(pageConfig?.order) && pageConfig?.order.length ? [...pageConfig.order] : [...defaultPageConfig.order],
    visiblePages: { ...defaultPageConfig.visiblePages, ...(pageConfig?.visiblePages || {}) },
  };
}

function toModel(row: any): PdfUserModel {
  return {
    id: row.id,
    user_id: row.user_id,
    preset_id: row.preset_id,
    source_model_id: row.source_model_id || undefined,
    name: row.name,
    theme: normalizeTheme(row.theme),
    logo_url: row.logo_url || null,
    cover_image_url: row.cover_image_url || null,
    logo_transform: normalizeTransform(row.logo_transform),
    cover_image_transform: normalizeTransform(row.cover_image_transform),
    page_config: normalizePageConfig(row.page_config),
    is_default: Boolean(row.is_default),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toRow(model: PdfUserModel) {
  return {
    id: model.id,
    user_id: model.user_id,
    preset_id: model.preset_id,
    source_model_id: model.source_model_id || null,
    name: model.name,
    theme: normalizeTheme(model.theme),
    logo_url: model.logo_url,
    cover_image_url: model.cover_image_url,
    logo_transform: normalizeTransform(model.logo_transform),
    cover_image_transform: normalizeTransform(model.cover_image_transform),
    page_config: normalizePageConfig(model.page_config),
    is_default: model.is_default,
    created_at: model.created_at,
    updated_at: model.updated_at,
  };
}

function readLocalModels(): PdfUserModel[] {
  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function migrateLocalModelsToSupabase(userId: string) {
  const migrationKey = `${LOCAL_MIGRATION_KEY_PREFIX}${userId}`;
  if (localStorage.getItem(migrationKey) === 'true') return;

  const localModels = readLocalModels().filter(model => model.user_id === userId);
  if (!localModels.length) {
    localStorage.setItem(migrationKey, 'true');
    return;
  }

  const rows = localModels.map(model => toRow({
    ...model,
    theme: normalizeTheme(model.theme),
    logo_transform: normalizeTransform(model.logo_transform),
    cover_image_transform: normalizeTransform(model.cover_image_transform),
    page_config: normalizePageConfig(model.page_config),
  }));

  const { error } = await supabase
    .from('pdf_user_models')
    .upsert(rows, { onConflict: 'id' });

  if (error) throw error;
  localStorage.setItem(migrationKey, 'true');
}

export const pdfModelService = {
  getPresets(): PdfTemplatePreset[] {
    return PRESETS;
  },

  getPreset(id: string): PdfTemplatePreset | undefined {
    return PRESETS.find(p => p.id === id);
  },

  async getPresetSvgContent(presetId: string): Promise<string> {
    const preset = this.getPreset(presetId);
    if (!preset) throw new Error('Preset not found');

    if (preset.svg_file_url) {
      const response = await fetch(encodeURI(preset.svg_file_url));
      if (response.ok) return response.text();
    }

    if (preset.svg_content) return preset.svg_content;

    throw new Error(`Erro ao carregar SVG: ${preset.svg_file_url}`);
  },

  async getUserModels(userId: string): Promise<PdfUserModel[]> {
    await migrateLocalModelsToSupabase(userId);

    const { data, error } = await supabase
      .from('pdf_user_models')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(toModel);
  },

  async getModelById(id: string): Promise<PdfUserModel | null> {
    const { data, error } = await supabase
      .from('pdf_user_models')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? toModel(data) : null;
  },

  async createModelFromPreset(presetId: string, userId: string): Promise<PdfUserModel> {
    const preset = this.getPreset(presetId);
    if (!preset) throw new Error('Preset not found');

    const models = await this.getUserModels(userId);
    const isFirst = models.length === 0;
    const now = new Date().toISOString();

    const newModel: PdfUserModel = {
      id: generateId(),
      user_id: userId,
      preset_id: preset.id,
      name: `${preset.name} (Cópia)`,
      theme: { ...preset.default_theme },
      logo_url: null,
      cover_image_url: null,
      logo_transform: { ...defaultTransform },
      cover_image_transform: { ...defaultTransform },
      page_config: clonePageConfig(preset),
      is_default: isFirst,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('pdf_user_models')
      .insert([toRow(newModel)])
      .select()
      .single();

    if (error) throw error;
    return toModel(data);
  },

  async duplicateModel(modelId: string, userId: string): Promise<PdfUserModel> {
    const sourceModel = await this.getModelById(modelId);
    if (!sourceModel) throw new Error('Source model not found');

    const now = new Date().toISOString();
    const newModel: PdfUserModel = {
      ...sourceModel,
      id: generateId(),
      user_id: userId,
      source_model_id: sourceModel.id,
      name: `${sourceModel.name} (Cópia)`,
      is_default: false,
      theme: { ...sourceModel.theme },
      logo_transform: { ...sourceModel.logo_transform },
      cover_image_transform: { ...sourceModel.cover_image_transform },
      page_config: {
        order: [...sourceModel.page_config.order],
        visiblePages: { ...(sourceModel.page_config.visiblePages || {}) },
      },
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('pdf_user_models')
      .insert([toRow(newModel)])
      .select()
      .single();

    if (error) throw error;
    return toModel(data);
  },

  async updateModel(id: string, updates: Partial<PdfUserModel>): Promise<PdfUserModel> {
    const existing = await this.getModelById(id);
    if (!existing) throw new Error('Model not found');

    if (updates.is_default) {
      const { error: resetError } = await supabase
        .from('pdf_user_models')
        .update({ is_default: false })
        .eq('user_id', existing.user_id);

      if (resetError) throw resetError;
    }

    const nextModel: PdfUserModel = {
      ...existing,
      ...updates,
      theme: normalizeTheme(updates.theme || existing.theme),
      logo_transform: normalizeTransform(updates.logo_transform || existing.logo_transform),
      cover_image_transform: normalizeTransform(updates.cover_image_transform || existing.cover_image_transform),
      page_config: normalizePageConfig(updates.page_config || existing.page_config),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pdf_user_models')
      .update(toRow(nextModel))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return toModel(data);
  },

  async deleteModel(id: string): Promise<void> {
    const model = await this.getModelById(id);
    if (!model) return;

    const { error } = await supabase
      .from('pdf_user_models')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (model.is_default) {
      const remaining = await this.getUserModels(model.user_id);
      if (remaining.length > 0) {
        await this.setDefaultModel(remaining[0].id);
      }
    }
  },

  async setDefaultModel(id: string): Promise<void> {
    await this.updateModel(id, { is_default: true });
  },

  getAllModels(): PdfUserModel[] {
    return readLocalModels();
  },

  async uploadAsset(file: File, bucket: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `models/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
};
