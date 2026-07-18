import { PdfTemplatePreset } from '../types/pdfModels';

// @ts-ignore
import svg1 from '../../public/pdf-assets/covers/A4 -1.svg?raw';
// @ts-ignore
import svg2 from '../../public/pdf-assets/covers/A4 -2.svg?raw';
// @ts-ignore
import svg3 from '../../public/pdf-assets/covers/A4 -3.svg?raw';
// @ts-ignore
import svg4 from '../../public/pdf-assets/covers/A4 -4.svg?raw';
// @ts-ignore
import svg5 from '../../public/pdf-assets/covers/A4 -5.svg?raw';
// @ts-ignore
import svg6 from '../../public/pdf-assets/covers/A4 -6.svg?raw';
// @ts-ignore
import svg7 from '../../public/pdf-assets/covers/A4 -7.svg?raw';
// @ts-ignore
import svg8 from '../../public/pdf-assets/covers/A4 -8.svg?raw';
// @ts-ignore
import svg9 from '../../public/pdf-assets/covers/A4 -9.svg?raw';
// @ts-ignore
import svg10 from '../../public/pdf-assets/covers/A4 -10.svg?raw';
// @ts-ignore
import svg11 from '../../public/pdf-assets/covers/A4 -11.svg?raw';
// @ts-ignore
import svg12 from '../../public/pdf-assets/covers/A4 -12.svg?raw';

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

export const A4_PRESETS: PdfTemplatePreset[] = [
  {
    id: 'preset-1',
    name: 'A4 01 — Executivo Dourado',
    thumbnail_url: coverPath('A4 -1.svg'),
    svg_file_url: coverPath('A4 -1.svg'),
    svg_content: svg1,
    default_theme: { primary: '#0A2249', secondary: '#C49133', accent: '#FACB5C', neutral: '#1F2A2A' },
    page_config: pageConfig,
  },
  {
    id: 'preset-2',
    name: 'A4 02 — Verde Institucional',
    thumbnail_url: coverPath('A4 -2.svg'),
    svg_file_url: coverPath('A4 -2.svg'),
    svg_content: svg2,
    default_theme: { primary: '#051225', secondary: '#AFB77D', accent: '#FACB5C', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-3',
    name: 'A4 03 — Azul Comercial',
    thumbnail_url: coverPath('A4 -3.svg'),
    svg_file_url: coverPath('A4 -3.svg'),
    svg_content: svg3,
    default_theme: { primary: '#0051F0', secondary: '#051225', accent: '#64B0F3', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-4',
    name: 'A4 04 — Marinho Solar',
    thumbnail_url: coverPath('A4 -4.svg'),
    svg_file_url: coverPath('A4 -4.svg'),
    svg_content: svg4,
    default_theme: { primary: '#051225', secondary: '#0051F0', accent: '#FFCC00', neutral: '#D9D9D9' },
    page_config: pageConfig,
  },
  {
    id: 'preset-5',
    name: 'A4 05 — Verde Clean',
    thumbnail_url: coverPath('A4 -5.svg'),
    svg_file_url: coverPath('A4 -5.svg'),
    svg_content: svg5,
    default_theme: { primary: '#39B66A', secondary: '#0E2337', accent: '#FACB5C', neutral: '#D9D9D9' },
    page_config: pageConfig,
  },
  {
    id: 'preset-6',
    name: 'A4 06 — Investimento Solar',
    thumbnail_url: coverPath('A4 -6.svg'),
    svg_file_url: coverPath('A4 -6.svg'),
    svg_content: svg6,
    default_theme: { primary: '#051225', secondary: '#AFB77D', accent: '#FFCC00', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-7',
    name: 'A4 07 — Geométrico Premium',
    thumbnail_url: coverPath('A4 -7.svg'),
    svg_file_url: coverPath('A4 -7.svg'),
    svg_content: svg7,
    default_theme: { primary: '#0051F0', secondary: '#FFCC00', accent: '#FFD600', neutral: '#3A3A3C' },
    page_config: pageConfig,
  },
  {
    id: 'preset-8',
    name: 'A4 08 — Diagonal Comercial',
    thumbnail_url: coverPath('A4 -8.svg'),
    svg_file_url: coverPath('A4 -8.svg'),
    svg_content: svg8,
    default_theme: { primary: '#0051F0', secondary: '#C49133', accent: '#39B66A', neutral: '#D9D9D9' },
    page_config: pageConfig,
  },
  {
    id: 'preset-9',
    name: 'A4 09 — Orgânico Dourado',
    thumbnail_url: coverPath('A4 -9.svg'),
    svg_file_url: coverPath('A4 -9.svg'),
    svg_content: svg9,
    default_theme: { primary: '#C49133', secondary: '#AFB77D', accent: '#FACB5C', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-10',
    name: 'A4 10 — Verde Futuro',
    thumbnail_url: coverPath('A4 -10.svg'),
    svg_file_url: coverPath('A4 -10.svg'),
    svg_content: svg10,
    default_theme: { primary: '#15AE51', secondary: '#051225', accent: '#FFD600', neutral: '#1E1E1E' },
    page_config: pageConfig,
  },
  {
    id: 'preset-11',
    name: 'A4 11 — Comercial Solar',
    thumbnail_url: coverPath('A4 -11.svg'),
    svg_file_url: coverPath('A4 -11.svg'),
    svg_content: svg11,
    default_theme: { primary: '#1AA6BE', secondary: '#D4D5D7', accent: '#DD400B', neutral: '#000000' },
    page_config: pageConfig,
  },
  {
    id: 'preset-12',
    name: 'A4 12 — Prisma Solar',
    thumbnail_url: coverPath('A4 -12.svg'),
    svg_file_url: coverPath('A4 -12.svg'),
    svg_content: svg12,
    default_theme: { primary: '#142637', secondary: '#79ADD9', accent: '#F8B51F', neutral: '#D9D9D9' },
    page_config: pageConfig,
  },
];
