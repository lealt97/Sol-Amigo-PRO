import { PdfUserModel } from '../../../types/pdfModels';
import { pdfModelService } from '../../../services/pdfModelService';
import { buildCoverSvg } from './coverSvgEngine';
import { applyDynamicCoverData, DynamicCoverValues } from './dynamicCoverData';
import { extractActiveLogo } from '../../../utils/logoHelper';

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

function formatPowerKwp(proposal: any) {
  const value = Number(
    proposal.solar?.installed_power_kwp ||
    proposal.solar_kit_snapshot?.kit_power_kwp ||
    proposal.solar?.required_power_kwp ||
    0
  );

  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`;
}

function formatCurrency(value: unknown) {
  const numericValue = Number(value || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return '';

  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

function formatClientDocument(value: unknown) {
  const digits = String(value || '').replace(/\D/g, '');

  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  return String(value || '').trim();
}

function formatSystemType(value: unknown) {
  const labels: Record<string, string> = {
    on_grid: 'Sistema On-Grid',
    hybrid: 'Sistema Híbrido',
    off_grid: 'Sistema Off-Grid',
  };

  return labels[String(value || '')] || '';
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

function buildDynamicValues(proposal: any): DynamicCoverValues {
  return {
    clientName: proposal.client?.name || 'Cliente',
    clientDocument: formatClientDocument(proposal.client?.document),
    powerKwp: formatPowerKwp(proposal),
    cityState: resolveCityState(proposal),
    date: new Date().toLocaleDateString('pt-BR'),
    validityText: resolveValidityText(proposal),
    proposalCode: proposal.code || '',
    companyName: proposal.profile?.company_name || proposal.company?.name || '',
    sellerName: proposal.profile?.seller_name || '',
    systemType: formatSystemType(proposal.system_type),
    investment: formatCurrency(proposal.final_price),
  };
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
    const logoUrl = await urlToBase64(activeLogo);
    const coverImageUrl = await urlToBase64(model.cover_image_url);
    const dynamicValues = buildDynamicValues(proposal);

    const themedSvg = buildCoverSvg(
      svgSource,
      {
        current: model.theme,
        original: preset.default_theme,
      },
      {
        clientName: dynamicValues.clientName,
        clientDocument: dynamicValues.clientDocument,
        powerKwp: dynamicValues.powerKwp,
        cityState: dynamicValues.cityState,
        date: dynamicValues.date,
        validityText: dynamicValues.validityText,
        proposalCode: dynamicValues.proposalCode,
        companyName: dynamicValues.companyName,
        sellerName: dynamicValues.sellerName,
        systemType: dynamicValues.systemType,
        investment: dynamicValues.investment,
        logoUrl,
        coverImageUrl,
        logoTransform: model.logo_transform,
        coverImageTransform: model.cover_image_transform,
      },
      model.id,
      preset.id,
    );

    const finalSvg = applyDynamicCoverData(
      themedSvg,
      dynamicValues,
      model.theme,
      preset.id,
    );

    return await svgToPngDataUrl(finalSvg);
  } catch (err) {
    console.error('Error generating SVG cover image:', err);
    return null;
  }
}
