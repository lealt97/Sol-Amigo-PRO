import { PdfTemplatePreset, PdfUserModel } from '../types/pdfModels';
import { supabase } from '../lib/supabase/client';
import { A4_PRESETS } from './pdfA4Presets';

const LOCAL_STORAGE_KEY = 'solamigo_pdf_user_models';

const defaultTransform = { zoom: 1, x: 0, y: 0, rotate: 0 };

export const PRESETS: PdfTemplatePreset[] = A4_PRESETS;

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function clonePageConfig(preset: PdfTemplatePreset) {
  return {
    order: [...preset.page_config.order],
    visiblePages: { ...(preset.page_config.visiblePages || {}) },
  };
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
    if (preset.svg_content) return preset.svg_content;

    const response = await fetch(encodeURI(preset.svg_file_url));
    if (!response.ok) throw new Error(`Erro ao carregar SVG: ${preset.svg_file_url}`);
    return response.text();
  },

  async getUserModels(userId: string): Promise<PdfUserModel[]> {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    try {
      const models: PdfUserModel[] = JSON.parse(raw);
      return models.filter(m => m.user_id === userId);
    } catch (e) {
      console.error('Error parsing user models from local storage', e);
      return [];
    }
  },

  async getModelById(id: string): Promise<PdfUserModel | null> {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    try {
      const models: PdfUserModel[] = JSON.parse(raw);
      return models.find(m => m.id === id) || null;
    } catch (e) {
      return null;
    }
  },

  async createModelFromPreset(presetId: string, userId: string): Promise<PdfUserModel> {
    const preset = this.getPreset(presetId);
    if (!preset) throw new Error('Preset not found');

    const models = await this.getUserModels(userId);
    const isFirst = models.length === 0;

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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const allModels = this.getAllModels();
    allModels.push(newModel);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allModels));
    return newModel;
  },

  async duplicateModel(modelId: string, userId: string): Promise<PdfUserModel> {
    const sourceModel = await this.getModelById(modelId);
    if (!sourceModel) throw new Error('Source model not found');

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
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const allModels = this.getAllModels();
    allModels.push(newModel);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allModels));
    return newModel;
  },

  async updateModel(id: string, updates: Partial<PdfUserModel>): Promise<PdfUserModel> {
    const allModels = this.getAllModels();
    const index = allModels.findIndex(m => m.id === id);
    if (index === -1) throw new Error('Model not found');

    allModels[index] = {
      ...allModels[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    if (updates.is_default) {
      for (let i = 0; i < allModels.length; i++) {
        if (i !== index && allModels[i].user_id === allModels[index].user_id) {
          allModels[i].is_default = false;
        }
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allModels));
    return allModels[index];
  },

  async deleteModel(id: string): Promise<void> {
    let allModels = this.getAllModels();
    const model = allModels.find(m => m.id === id);
    if (!model) return;
    
    allModels = allModels.filter(m => m.id !== id);
    
    if (model.is_default && allModels.length > 0) {
      const userModels = allModels.filter(m => m.user_id === model.user_id);
      if (userModels.length > 0) {
        userModels[0].is_default = true;
      }
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(allModels));
  },

  async setDefaultModel(id: string): Promise<void> {
    await this.updateModel(id, { is_default: true });
  },

  getAllModels(): PdfUserModel[] {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
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
