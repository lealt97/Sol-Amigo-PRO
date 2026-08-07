import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { useAuth } from '../../../contexts/AuthContext';
import { blobToImageDataUrl } from '../../../lib/images/urlToDataUrl';
import type { ProposalPageKey } from '../../../lib/pdf/proposalPageRegistry';
import { profileService } from '../../../services/profileService';
import { extractActiveLogo, extractAllLogos } from '../../../utils/logoHelper';
import { pdfDesignService } from '../services/pdfDesignService';
import { PdfUserModel, TransformConfig } from '../types/pdfDesignTypes';
import { getDefaultTransform, normalizeTransform } from './CoverPhotoFramingSelector';
import { ColorEditor } from './ColorEditor';
import { ImageEditor } from './ImageEditor';
import { PageConfigEditor } from './PageConfigEditor';
import { PdfPreview, type PdfPreviewHandle } from './PdfPreview';

interface DesignPdfEditorProps {
  model: PdfUserModel;
  onClose: () => void;
  onSave: () => void;
}

type EditorTab = 'colors' | 'images' | 'pages';

export function DesignPdfEditor({ model: initialModel, onClose, onSave }: DesignPdfEditorProps) {
  const { user } = useAuth();
  const previewRef = useRef<PdfPreviewHandle | null>(null);
  const [availableLogos, setAvailableLogos] = useState<string[]>([]);
  const [profileLogo, setProfileLogo] = useState<string | null>(null);
  const [logosLoaded, setLogosLoaded] = useState(false);
  const [model, setModel] = useState<PdfUserModel>({
    ...initialModel,
    logo_transform: normalizeTransform(initialModel.logo_transform),
    cover_image_transform: normalizeTransform(initialModel.cover_image_transform),
  });
  const [liveCoverImageDataUrl, setLiveCoverImageDataUrl] = useState<string | null | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemovingCoverImage, setIsRemovingCoverImage] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>('colors');
  const [activePreviewPage, setActivePreviewPage] = useState<ProposalPageKey>('cover');

  useEffect(() => {
    async function loadLogos() {
      if (!user) return;
      try {
        const profile = await profileService.getProfile(user.id);
        const logos = extractAllLogos(profile.logo_url);
        const activeLogo = extractActiveLogo(profile.logo_url);
        const fallbackLogo = activeLogo && logos.includes(activeLogo) ? activeLogo : logos[0] || null;

        setAvailableLogos(logos);
        setProfileLogo(activeLogo);
        setModel((currentModel) => {
          const selectedLogoBelongsToAccount = Boolean(
            currentModel.logo_url && logos.includes(currentModel.logo_url),
          );

          return selectedLogoBelongsToAccount
            ? currentModel
            : { ...currentModel, logo_url: fallbackLogo };
        });
        setLogosLoaded(true);
      } catch (err) {
        console.error('Error loading available logos:', err);
        toast.error('Não foi possível carregar os logos cadastrados na conta.');
      }
    }
    loadLogos();
  }, [user]);

  const updateTheme = (key: keyof PdfUserModel['theme'], value: string) => {
    setModel((prev) => ({ ...prev, theme: { ...prev.theme, [key]: value } }));
  };

  const setTransform = (target: 'logo_transform' | 'cover_image_transform', transform: TransformConfig) => {
    setModel((prev) => ({ ...prev, [target]: normalizeTransform(transform) }));
  };

  const updateTransform = (target: 'logo_transform' | 'cover_image_transform', key: keyof TransformConfig, value: number) => {
    setModel((prev) => ({ ...prev, [target]: { ...normalizeTransform(prev[target]), [key]: value } }));
  };

  const resetTransform = (target: 'logo_transform' | 'cover_image_transform') => {
    setModel((prev) => ({ ...prev, [target]: getDefaultTransform() }));
  };

  const handleSave = async () => {
    if (logosLoaded && model.logo_url && !availableLogos.includes(model.logo_url)) {
      toast.error('Escolha um dos logos cadastrados em Configurações da Conta > Logo.');
      setActiveTab('images');
      return;
    }

    try {
      setIsSaving(true);
      await pdfDesignService.updateModel(model.id, {
        ...model,
        logo_transform: normalizeTransform(model.logo_transform),
        cover_image_transform: normalizeTransform(model.cover_image_transform),
      });
      toast.success('Modelo salvo com sucesso!');
      onSave();
    } catch (e) {
      toast.error('Erro ao salvar modelo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCoverImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    _target: 'cover_image_url',
  ) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const localDataUrl = await blobToImageDataUrl(file);
      setLiveCoverImageDataUrl(localDataUrl);

      const url = await pdfDesignService.uploadAsset(file, 'pdf-assets', user.id);
      setModel((prev) => ({
        ...prev,
        cover_image_url: url,
        cover_image_transform: getDefaultTransform(),
      }));
      toast.success('Imagem enviada. Escolha o ponto de interesse no enquadramento.');
    } catch (err) {
      setLiveCoverImageDataUrl(null);
      console.error('Error uploading PDF cover image:', err);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      event.target.value = '';
    }
  };

  const handleCoverImageRemove = async () => {
    const coverImageUrl = model.cover_image_url;
    if (!coverImageUrl || !user || isRemovingCoverImage) return;

    const resetCoverTransform = getDefaultTransform();

    try {
      setIsRemovingCoverImage(true);

      await pdfDesignService.updateModel(model.id, {
        cover_image_url: null,
        cover_image_transform: resetCoverTransform,
      });

      setLiveCoverImageDataUrl(null);
      setModel((prev) => ({
        ...prev,
        cover_image_url: null,
        cover_image_transform: resetCoverTransform,
      }));

      try {
        await pdfDesignService.removeAsset(coverImageUrl, 'pdf-assets', user.id);
      } catch (storageError) {
        console.error('Error removing private PDF cover asset:', storageError);
      }

      toast.success('Foto removida. Você já pode enviar uma nova imagem.');
    } catch (error) {
      console.error('Error removing PDF cover image:', error);
      toast.error('Não foi possível remover a foto da capa.');
    } finally {
      setIsRemovingCoverImage(false);
    }
  };

  const handlePageNavigation = (pageKey: ProposalPageKey) => {
    setActivePreviewPage(pageKey);
    previewRef.current?.scrollToPage(pageKey);
  };

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: 'colors', label: 'Cores' },
    { id: 'images', label: 'Imagens' },
    { id: 'pages', label: 'Páginas' },
  ];

  return (
    <div className="h-[calc(100dvh-96px)] -m-6 flex min-h-0 flex-row overflow-hidden bg-slate-950">
      <aside className="flex h-full w-[420px] shrink-0 flex-col border-r border-brand-border bg-brand-surface/95">
        <div className="p-5 border-b border-brand-border flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <Label className="text-xs text-slate-400 uppercase tracking-wider font-bold">Nome do modelo</Label>
            <Input value={model.name} onChange={(event) => setModel((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 bg-slate-950/50 border-brand-border text-white" />
          </div>
          <Button type="button" onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        <div className="flex border-b border-brand-border">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${activeTab === tab.id ? 'text-white bg-brand-primary/20 border-b-2 border-brand-primary' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'colors' && <ColorEditor theme={model.theme} onChange={updateTheme} />}
          {activeTab === 'images' && (
            <ImageEditor
              model={model}
              profileLogo={profileLogo}
              availableLogos={availableLogos}
              onFileUpload={handleCoverImageUpload}
              onCoverImageRemove={handleCoverImageRemove}
              isRemovingCoverImage={isRemovingCoverImage}
              onLogoSelect={(logoUrl) => setModel((prev) => ({ ...prev, logo_url: logoUrl }))}
              onTransformChange={updateTransform}
              onTransformSet={setTransform}
              onTransformReset={resetTransform}
            />
          )}
          {activeTab === 'pages' && (
            <PageConfigEditor
              pageConfig={model.page_config}
              activePageKey={activePreviewPage}
              onNavigate={handlePageNavigation}
              onChange={(page_config) => setModel((prev) => ({ ...prev, page_config }))}
            />
          )}
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 bg-slate-900/80">
        <PdfPreview
          ref={previewRef}
          model={model}
          coverImageDataUrl={liveCoverImageDataUrl}
          onActivePageChange={setActivePreviewPage}
        />
      </main>
    </div>
  );
}
