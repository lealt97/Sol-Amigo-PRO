import { PdfTemplatePreset } from '../types/pdfModels';

const pageConfig = {
  order: ['cover', 'intro', 'technical', 'financial', 'payback'],
  visiblePages: {
    cover: true,
    intro: true,
    technical: true,
    financial: true,
    payback: true,
  },
};

const coverPath = (fileName: string) => `/pdf-assets/covers/${fileName}`;

const coverSvg = (fileName: string) => `
<svg width="595" height="842" viewBox="0 0 595 842" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="595" height="842" fill="#FFFFFF" />
  <image href="${coverPath(fileName)}" x="0" y="0" width="595" height="842" preserveAspectRatio="xMidYMid slice" />
</svg>`;

export const A4_PRESETS: PdfTemplatePreset[] = [
  {
    id: 'preset-1',
    name: 'A4 01 — Executivo Dourado',
    thumbnail_url: coverPath('A4 - 1.svg'),
    svg_file_url: coverPath('A4 - 1.svg'),
    svg_content: coverSvg('A4 - 1.svg'),
    default_theme: { primary: '#0A2249', secondary: '#C49133', accent: '#FACB5C', neutral: '#1F2A2A' },
    page_config: pageConfig,
  },
  {
    id: 'preset-2',
    name: 'A4 02 — Verde Institucional',
    thumbnail_url: coverPath('A4 - 2.svg'),
    svg_file_url: coverPath('A4 - 2.svg'),
    svg_content: coverSvg('A4 - 2.svg'),
    default_theme: { primary: '#051225', secondary: '#AFB77D', accent: '#FACB5C', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-3',
    name: 'A4 03 — Azul Comercial',
    thumbnail_url: coverPath('A4 - 3.svg'),
    svg_file_url: coverPath('A4 - 3.svg'),
    svg_content: coverSvg('A4 - 3.svg'),
    default_theme: { primary: '#0051F0', secondary: '#051225', accent: '#64B0F3', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-4',
    name: 'A4 04 — Marinho Solar',
    thumbnail_url: coverPath('A4 - 4.svg'),
    svg_file_url: coverPath('A4 - 4.svg'),
    svg_content: coverSvg('A4 - 4.svg'),
    default_theme: { primary: '#051225', secondary: '#0051F0', accent: '#FFCC00', neutral: '#D9D9D9' },
    page_config: pageConfig,
  },
  {
    id: 'preset-5',
    name: 'A4 05 — Verde Clean',
    thumbnail_url: coverPath('A4 - 5.svg'),
    svg_file_url: coverPath('A4 - 5.svg'),
    svg_content: coverSvg('A4 - 5.svg'),
    default_theme: { primary: '#39B66A', secondary: '#0E2337', accent: '#FACB5C', neutral: '#D9D9D9' },
    page_config: pageConfig,
  },
  {
    id: 'preset-6',
    name: 'A4 06 — Investimento Solar',
    thumbnail_url: coverPath('A4 - 6.svg'),
    svg_file_url: coverPath('A4 - 6.svg'),
    svg_content: coverSvg('A4 - 6.svg'),
    default_theme: { primary: '#051225', secondary: '#AFB77D', accent: '#FFCC00', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-7',
    name: 'A4 07 — Geométrico Premium',
    thumbnail_url: coverPath('A4 - 7.svg'),
    svg_file_url: coverPath('A4 - 7.svg'),
    svg_content: coverSvg('A4 - 7.svg'),
    default_theme: { primary: '#0051F0', secondary: '#FFCC00', accent: '#FFD600', neutral: '#3A3A3C' },
    page_config: pageConfig,
  },
  {
    id: 'preset-8',
    name: 'A4 08 — Diagonal Comercial',
    thumbnail_url: coverPath('A4 - 8.svg'),
    svg_file_url: coverPath('A4 - 8.svg'),
    svg_content: coverSvg('A4 - 8.svg'),
    default_theme: { primary: '#0051F0', secondary: '#C49133', accent: '#39B66A', neutral: '#D9D9D9' },
    page_config: pageConfig,
  },
  {
    id: 'preset-9',
    name: 'A4 09 — Orgânico Dourado',
    thumbnail_url: coverPath('A4 - 9.svg'),
    svg_file_url: coverPath('A4 - 9.svg'),
    svg_content: coverSvg('A4 - 9.svg'),
    default_theme: { primary: '#C49133', secondary: '#AFB77D', accent: '#FACB5C', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-10',
    name: 'A4 10 — Verde Futuro',
    thumbnail_url: coverPath('A4 -10.svg'),
    svg_file_url: coverPath('A4 -10.svg'),
    svg_content: coverSvg('A4 -10.svg'),
    default_theme: { primary: '#15AE51', secondary: '#051225', accent: '#FFD600', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
];
