import React, { useEffect, useMemo, useState } from 'react';
import { PdfUserModel } from '../../types/pdfModels';
import { pdfModelService } from '../../services/pdfModelService';

interface PdfPreviewProps {
  model: PdfUserModel;
}

function setHref(element: Element | null, href: string) {
  if (!element || !href) return;
  element.setAttribute('href', href);
  element.setAttribute('xlink:href', href);
}

function findCoverImage(doc: Document) {
  return doc.getElementById('cover-photo-image') || doc.querySelector('pattern image') || doc.querySelector('image');
}

function applyImageTransform(element: Element, t: PdfUserModel['cover_image_transform']) {
  const width = parseFloat(element.getAttribute('width') || '595');
  const height = parseFloat(element.getAttribute('height') || '842');
  const cx = width / 2;
  const cy = height / 2;
  element.setAttribute('transform', `translate(${t.x}, ${t.y}) translate(${cx}, ${cy}) scale(${t.zoom}) rotate(${t.rotate}) translate(${-cx}, ${-cy})`);
}

function applyText(doc: Document, id: string, value: string) {
  const element = doc.getElementById(id);
  if (element) element.textContent = value;
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
    if (!svgSource) return '';

    let svg = svgSource;
    svg = svg.replace(/var\(--pdf-primary\)/g, model.theme.primary);
    svg = svg.replace(/var\(--pdf-secondary\)/g, model.theme.secondary);
    svg = svg.replace(/var\(--pdf-accent\)/g, model.theme.accent);
    svg = svg.replace(/var\(--pdf-neutral\)/g, model.theme.neutral);

    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');

    const coverImage = findCoverImage(doc);
    if (coverImage && model.cover_image_url) {
      setHref(coverImage, model.cover_image_url);
      applyImageTransform(coverImage, model.cover_image_transform);
    }

    const logoImage = doc.getElementById('company-logo');
    if (logoImage && model.logo_url) {
      setHref(logoImage, model.logo_url);
      const lt = model.logo_transform;
      logoImage.setAttribute('transform', `translate(${lt.x}, ${lt.y}) scale(${lt.zoom}) rotate(${lt.rotate})`);
    }

    applyText(doc, 'client-name', 'Cliente Exemplo Ltda');
    applyText(doc, 'project-power', 'Potência: 12.5 kWp');
    applyText(doc, 'city-state', 'São Paulo, SP');
    applyText(doc, 'proposal-date', new Date().toLocaleDateString('pt-BR'));

    return new XMLSerializer().serializeToString(doc);
  }, [svgSource, model]);

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
