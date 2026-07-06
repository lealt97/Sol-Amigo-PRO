export interface PdfTemplatePreset {
  id: string;
  name: string;
  thumbnail_url: string;
  svg_file_url: string;
  svg_content?: string;
  default_theme: PdfTheme;
  page_config: PdfPageConfig;
}

export interface PdfTheme {
  primary: string;
  secondary: string;
  accent: string;
  neutral: string;
}

export interface TransformConfig {
  zoom: number;
  x: number;
  y: number;
  rotate: number;
}

export interface PdfPageConfig {
  order: string[];
  visiblePages?: Record<string, boolean>;
}

export interface PdfUserModel {
  id: string;
  user_id: string;
  preset_id: string;
  source_model_id?: string;
  name: string;
  theme: PdfTheme;
  logo_url: string | null;
  cover_image_url: string | null;
  logo_transform: TransformConfig;
  cover_image_transform: TransformConfig;
  page_config: PdfPageConfig;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
