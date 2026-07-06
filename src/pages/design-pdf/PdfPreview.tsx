import React, { useEffect, useMemo, useState } from 'react';
import { PdfUserModel } from '../../types/pdfModels';
import { pdfModelService } from '../../services/pdfModelService';
import { buildCoverSvg } from '../../lib/pdf/utils/coverSvgEngine';

interface PdfPreviewProps {
  model: PdfUserModel;
}

export function PdfPreview({ model }: PdfPreviewProps) {
  const preset = useMemo(() => pdfModelService.getPreset(model.preset_id), [model.preset_id]);
  const [svgSource, setSvgSource] = useState('');

  useEffect(() => {
    let active = true;

    async function loadSvg() {
      if (!preset) {
        setSvgSource('');
        return;
      }

      try {
        const text = await pdfModelService.getPresetSvgContent(preset.id);
        if (active) setSvgSource(text);
      } catch (error) {
        console.error('Erro ao carregar SVG do preset:', error);
        if (active) setSvgSource('');
      }
    }

    loadSvg();
    return () => {
      active = false;
    };
  }, [preset]);

  const finalSvgContent = useMemo(() => {
    if (!svgSource || !preset) return '';

    return buildCoverSvg(
      svgSource,
      {
        current: model.theme,
        original: preset.default_theme,
      },
      {
        clientName: 'Cliente Exemplo Ltda',
        powerKwp: '12,50 kWp',
        cityState: 'São Paulo - SP',
        date: new Date().toLocaleDateString('pt-BR'),
        logoUrl: model.logo_url,
        coverImageUrl: model.cover_image_url,
        logoTransform: model.logo_transform,
        coverImageTransform: model.cover_image_transform,
      }
    );
  }, [svgSource, preset, model]);

  if (!preset) return <div className="text-slate-500">Preset não encontrado.</div>;
  if (!finalSvgContent) return <div className="text-slate-500">Carregando preview...</div>;

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div 
        className="shadow-2xl border border-brand-border bg-white max-w-full max-h-full aspect-[1/1.414]"
        style={{ width: 'auto', height: '100%', minHeight: '500px' }}
        dangerouslySetInnerHTML={{ __html: finalSvgContent }}
      />
    </div>
  );
}
