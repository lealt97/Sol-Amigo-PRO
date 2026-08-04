import { PdfUserModel } from '../../../types/pdfModels';
import { pdfModelService } from '../../../services/pdfModelService';
import { resolveStorageAssetUrl } from '../../storage/privateAsset';
import { urlToDataUrl } from '../../images/urlToDataUrl';
import { buildCoverSvg } from './coverSvgEngine';
import { extractActiveLogo } from '../../../utils/logoHelper';

async function safeUrlToDataUrl(url: string | null | undefined) {
  try {
    return await urlToDataUrl(url);
  } catch (error) {
    console.error('Erro ao carregar imagem para capa do PDF:', error);
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

function formatPowerKwp(proposal: any) {
  const value = Number(
    proposal.solar?.installed_power_kwp ||
    proposal.solar_kit_snapshot?.kit_power_kwp ||
    proposal.solar?.required_power_kwp ||
    0
  );

  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`;
}

function resolveCityState(proposal: any) {
  const city = proposal.client?.city || proposal.client?.cidade || '';
  const state = proposal.client?.state || proposal.client?.uf || '';
  return [city, state].filter(Boolean).join(' - ') || 'Localização a confirmar';
}

function resolveValidityText(proposal: any) {
  const validityDays = Number(proposal.profile?.default_validity_days || proposal.validity_days || 7);
  return `validade: ${validityDays} dias`;
}

export async function generateSvgCoverImage(
  model: PdfUserModel,
  proposal: any
): Promise<string | null> {
  try {
    const preset = pdfModelService.getPreset(model.preset_id);
    if (!preset) return null;

    const svgSource = await pdfModelService.getPresetSvgContent(preset.id);
    const resolvedRawLogo = model.logo_url || proposal.profile?.logo_url || proposal.company?.logo_url || null;
    const activeLogo = extractActiveLogo(resolvedRawLogo);
    const logoUrl = await safeUrlToDataUrl(activeLogo);
    const privateCoverUrl = await resolveStorageAssetUrl(model.cover_image_url, 900);
    const coverImageUrl = await safeUrlToDataUrl(privateCoverUrl);
    const generationDate = new Date().toLocaleDateString('pt-BR');

    const finalSvg = buildCoverSvg(
      svgSource,
      {
        current: model.theme,
        original: preset.default_theme,
      },
      {
        clientName: proposal.client?.name || 'Cliente',
        powerKwp: formatPowerKwp(proposal),
        cityState: resolveCityState(proposal),
        date: generationDate,
        validityText: resolveValidityText(proposal),
        logoUrl,
        coverImageUrl,
        logoTransform: model.logo_transform,
        coverImageTransform: model.cover_image_transform,
      },
      model.id,
      preset.id,
    );

    return await svgToPngDataUrl(finalSvg);
  } catch (err) {
    console.error('Error generating SVG cover image:', err);
    return null;
  }
}
