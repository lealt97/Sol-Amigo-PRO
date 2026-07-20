import { useEffect, useMemo, useState } from 'react';
import { PdfUserModel } from '../types/pdfDesignTypes';
import { pdfDesignService } from '../services/pdfDesignService';
import { buildSvgTemplate } from '../engines/svgTemplateEngine';
import { useAuth } from '../../../contexts/AuthContext';
import { profileService } from '../../../services/profileService';
import { extractActiveLogo } from '../../../utils/logoHelper';

interface PdfPreviewProps {
  model: PdfUserModel;
  isCardPreview?: boolean;
}

export function PdfPreview({ model, isCardPreview }: PdfPreviewProps) {
  const { user } = useAuth();
  const [profileLogo, setProfileLogo] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const preset = useMemo(() => pdfDesignService.getPreset(model.preset_id), [model.preset_id]);
  const [svgSource, setSvgSource] = useState('');

  useEffect(() => {
    async function loadProfileLogo() {
      if (!user) return;
      try {
        const profile = await profileService.getProfile(user.id);
        setProfileLogo(extractActiveLogo(profile.logo_url));
      } catch (err) {
        console.error('Error loading profile logo in preview:', err);
      }
    }
    loadProfileLogo();
  }, [user]);

  useEffect(() => {
    let active = true;

    async function resolveCoverImage() {
      if (!model.cover_image_url) {
        setCoverImageUrl(null);
        return;
      }

      try {
        const resolved = await pdfDesignService.resolveAssetUrl(model.cover_image_url, 900);
        if (active) setCoverImageUrl(resolved);
      } catch (error) {
        console.error('Error resolving private cover image in preview:', error);
        if (active) setCoverImageUrl(null);
      }
    }

    resolveCoverImage();
    return () => {
      active = false;
    };
  }, [model.cover_image_url]);

  useEffect(() => {
    let active = true;

    async function loadSvg() {
      if (!preset) {
        setSvgSource('');
        return;
      }
      try {
        const text = await pdfDesignService.getPresetSvgContent(preset.id);
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

    return buildSvgTemplate({
      svgSource,
      theme: {
        current: model.theme,
        original: preset.default_theme,
      },
      texts: {
        clientName: 'Cliente Exemplo Ltda',
        powerKwp: '12,50 kWp',
        cityState: 'São Paulo - SP',
        date: new Date().toLocaleDateString('pt-BR'),
      },
      logoUrl: extractActiveLogo(model.logo_url) || profileLogo,
      coverImageUrl,
      logoTransform: model.logo_transform,
      coverImageTransform: model.cover_image_transform,
      modelId: model.id,
    });
  }, [svgSource, preset, model, profileLogo, coverImageUrl]);

  if (!preset) return <div className="text-slate-500">Preset não encontrado.</div>;
  if (!finalSvgContent) return <div className="text-slate-500">Carregando preview...</div>;

  if (isCardPreview) {
    return (
      <div
        className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:block flex items-center justify-center overflow-hidden"
        dangerouslySetInnerHTML={{ __html: finalSvgContent }}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div
        className="shadow-2xl border border-brand-border bg-white w-full h-auto md:w-auto md:h-full max-w-full max-h-full aspect-[1/1.414] [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:block flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: finalSvgContent }}
      />
    </div>
  );
}
