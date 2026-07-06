import { PdfUserModel } from '../../../types/pdfModels';
import { pdfModelService } from '../../../services/pdfModelService';
import { buildCoverSvg } from './coverSvgEngine';

async function urlToBase64(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erro ao carregar imagem para capa do PDF:', url, error);
    return null;
  }
}

function getCanvasSize(svgText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  const viewBox = svg?.getAttribute('viewBox');

  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return { width: parts[2], height: parts[3] };
    }
  }

  return {
    width: parseFloat(svg?.getAttribute('width') || '595'),
    height: parseFloat(svg?.getAttribute('height') || '842'),
  };
}

function svgToPngDataUrl(svgText: string): Promise<string> {
  const size = getCanvasSize(svgText);

  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size.width;
      canvas.height = size.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(url);
      resolve(pngUrl);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG into image'));
    };
    
    img.src = url;
  });
}

export async function generateSvgCoverImage(
  model: PdfUserModel,
  proposal: any
): Promise<string | null> {
  try {
    const preset = pdfModelService.getPreset(model.preset_id);
    if (!preset) return null;

    const svgSource = await pdfModelService.getPresetSvgContent(preset.id);
    const logoUrl = await urlToBase64(model.logo_url);
    const coverImageUrl = await urlToBase64(model.cover_image_url);

    const finalSvg = buildCoverSvg(
      svgSource,
      {
        current: model.theme,
        original: preset.default_theme,
      },
      {
        clientName: proposal.client?.name || 'Cliente',
        powerKwp: `${(proposal.solar?.installed_power_kwp || 0).toFixed(2)} kWp`,
        cityState: `${proposal.client?.city || ''} - ${proposal.client?.state || ''}`,
        date: new Date().toLocaleDateString('pt-BR'),
        logoUrl,
        coverImageUrl,
        logoTransform: model.logo_transform,
        coverImageTransform: model.cover_image_transform,
      }
    );

    return await svgToPngDataUrl(finalSvg);
  } catch (err) {
    console.error('Error generating SVG cover image:', err);
    return null;
  }
}
