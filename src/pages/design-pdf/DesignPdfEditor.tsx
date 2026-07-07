import React, { useState } from 'react';
import { PdfUserModel, TransformConfig } from '../../types/pdfModels';
import { pdfModelService } from '../../services/pdfModelService';
import { PdfPreview } from './PdfPreview';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Save, ArrowLeft, Upload, ZoomIn, ZoomOut, ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, RotateCcw, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

interface DesignPdfEditorProps {
  model: PdfUserModel;
  onClose: () => void;
  onSave: () => void;
}

const defaultTransform: TransformConfig = { zoom: 1, x: 0, y: 0, rotate: 0 };

export function DesignPdfEditor({ model: initialModel, onClose, onSave }: DesignPdfEditorProps) {
  const [model, setModel] = useState<PdfUserModel>(initialModel);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'colors' | 'images' | 'pages'>('colors');

  const updateTheme = (key: keyof PdfUserModel['theme'], value: string) => {
    setModel(prev => ({
      ...prev,
      theme: { ...prev.theme, [key]: value }
    }));
  };

  const updateTransform = (target: 'logo_transform' | 'cover_image_transform', key: keyof TransformConfig, value: number) => {
    setModel(prev => ({
      ...prev,
      [target]: { ...prev[target], [key]: value }
    }));
  };

  const resetTransform = (target: 'logo_transform' | 'cover_image_transform') => {
    setModel(prev => ({
      ...prev,
      [target]: { ...defaultTransform }
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await pdfModelService.updateModel(model.id, model);
      toast.success('Modelo salvo com sucesso!');
      onSave();
    } catch (e) {
      toast.error('Erro ao salvar modelo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'logo_url' | 'cover_image_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await pdfModelService.uploadAsset(file, target === 'logo_url' ? 'logos' : 'pdf-assets');
      setModel(prev => target === 'cover_image_url'
        ? { ...prev, cover_image_url: url, cover_image_transform: { ...defaultTransform } }
        : { ...prev, logo_url: url }
      );
      toast.success(target === 'cover_image_url' ? 'Imagem enviada. Ajuste o enquadramento com zoom e setas.' : 'Upload concluído!');
    } catch (err) {
      toast.error('Erro ao fazer upload da imagem.');
    }
  };

  const renderTransformControls = (target: 'logo_transform' | 'cover_image_transform', label: string) => {
    const t = model[target];
    const step = target === 'logo_transform' ? 10 : 50;

    return (
      <div className="space-y-3 mt-4 border-t border-brand-border pt-4">
        <Label className="text-xs text-slate-500 uppercase tracking-wider">{label} - Ajustes</Label>
        {target === 'cover_image_transform' && (
          <p className="text-xs text-slate-500">A imagem começa centralizada. Use zoom e setas para definir a área de interesse do crop.</p>
        )}
        
        <div className="flex gap-2 justify-center">
          <Button type="button" variant="outline" size="icon" onClick={() => updateTransform(target, 'zoom', Math.max(0.1, t.zoom - 0.1))}><ZoomOut className="w-4 h-4" /></Button>
          <Button type="button" variant="outline" size="icon" onClick={() => updateTransform(target, 'zoom', t.zoom + 0.1)}><ZoomIn className="w-4 h-4" /></Button>
          <Button type="button" variant="outline" size="icon" onClick={() => updateTransform(target, 'rotate', t.rotate - 90)}><RotateCcw className="w-4 h-4" /></Button>
          <Button type="button" variant="outline" size="icon" onClick={() => updateTransform(target, 'rotate', t.rotate + 90)}><RotateCw className="w-4 h-4" /></Button>
        </div>
        
        <div className="flex gap-2 justify-center items-center">
          <Button type="button" variant="outline" size="icon" onClick={() => updateTransform(target, 'x', t.x - step)}><ArrowLeftIcon className="w-4 h-4" /></Button>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" size="icon" onClick={() => updateTransform(target, 'y', t.y - step)}><ArrowUp className="w-4 h-4" /></Button>
            <Button type="button" variant="outline" size="icon" onClick={() => updateTransform(target, 'y', t.y + step)}><ArrowDown className="w-4 h-4" /></Button>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => updateTransform(target, 'x', t.x + step)}><ArrowRight className="w-4 h-4" /></Button>
        </div>

        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => resetTransform(target)}>
          Resetar enquadramento
        </Button>
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] -mx-6 -my-6 bg-brand-surface">
      {/* Sidebar Editor */}
      <div className="w-96 border-r border-brand-border bg-white flex flex-col h-full z-10 shadow-lg">
        <div className="p-4 border-b border-brand-border flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h2 className="font-semibold text-brand-dark">Editar Modelo</h2>
          </div>
          <Button onClick={handleSave} isLoading={isSaving} className="gap-2 h-8">
            <Save className="w-4 h-4" /> Salvar
          </Button>
        </div>

        <div className="p-4">
          <Label>Nome do Modelo</Label>
          <Input 
            value={model.name} 
            onChange={e => setModel(p => ({ ...p, name: e.target.value }))}
            className="mt-1"
          />
        </div>

        <div className="flex border-b border-brand-border px-4 gap-4">
          <button 
            className={`py-2 text-sm font-medium border-b-2 ${activeTab === 'colors' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500'}`}
            onClick={() => setActiveTab('colors')}
          >
            Cores
          </button>
          <button 
            className={`py-2 text-sm font-medium border-b-2 ${activeTab === 'images' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500'}`}
            onClick={() => setActiveTab('images')}
          >
            Imagens
          </button>
          <button 
            className={`py-2 text-sm font-medium border-b-2 ${activeTab === 'pages' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500'}`}
            onClick={() => setActiveTab('pages')}
          >
            Páginas
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {activeTab === 'colors' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cor Primária</Label>
                <div className="flex gap-2">
                  <Input type="color" value={model.theme.primary} onChange={e => updateTheme('primary', e.target.value)} className="w-12 h-10 p-1" />
                  <Input type="text" value={model.theme.primary} onChange={e => updateTheme('primary', e.target.value)} className="flex-1 uppercase font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input type="color" value={model.theme.secondary} onChange={e => updateTheme('secondary', e.target.value)} className="w-12 h-10 p-1" />
                  <Input type="text" value={model.theme.secondary} onChange={e => updateTheme('secondary', e.target.value)} className="flex-1 uppercase font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor Destaque</Label>
                <div className="flex gap-2">
                  <Input type="color" value={model.theme.accent} onChange={e => updateTheme('accent', e.target.value)} className="w-12 h-10 p-1" />
                  <Input type="text" value={model.theme.accent} onChange={e => updateTheme('accent', e.target.value)} className="flex-1 uppercase font-mono text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor Neutra (Fundos)</Label>
                <div className="flex gap-2">
                  <Input type="color" value={model.theme.neutral} onChange={e => updateTheme('neutral', e.target.value)} className="w-12 h-10 p-1" />
                  <Input type="text" value={model.theme.neutral} onChange={e => updateTheme('neutral', e.target.value)} className="flex-1 uppercase font-mono text-sm" />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4">Nota: O branco puro (#FFFFFF) é fixo e não editável.</p>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Logo da Empresa</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'logo_url')} className="hidden" id="logo-upload" />
                  <Button variant="outline" className="w-full gap-2" onClick={() => document.getElementById('logo-upload')?.click()}>
                    <Upload className="w-4 h-4" /> Enviar Logo
                  </Button>
                </div>
                {model.logo_url && renderTransformControls('logo_transform', 'Logo')}
              </div>

              <div className="space-y-2">
                <Label>Imagem da Capa</Label>
                <Input 
                  type="text" 
                  placeholder="URL da imagem (ou faça upload)"
                  value={model.cover_image_url || ''} 
                  onChange={e => setModel(p => ({ ...p, cover_image_url: e.target.value, cover_image_transform: { ...defaultTransform } }))}
                />
                <div className="flex items-center gap-2 mt-2">
                  <Input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'cover_image_url')} className="hidden" id="cover-upload" />
                  <Button variant="outline" className="w-full gap-2" onClick={() => document.getElementById('cover-upload')?.click()}>
                    <Upload className="w-4 h-4" /> Enviar Imagem
                  </Button>
                </div>
                {model.cover_image_url && renderTransformControls('cover_image_transform', 'Capa')}
              </div>
            </div>
          )}

          {activeTab === 'pages' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Configuração de ordem e visibilidade das páginas internas.</p>
              <div className="space-y-2">
                {model.page_config.order.map((pageId, idx) => (
                  <div key={pageId} className="flex items-center justify-between p-3 bg-gray-50 border border-brand-border rounded-lg">
                    <span className="text-sm font-medium text-brand-dark">{idx + 1}. {pageId}</span>
                    {/* Add drag handles or visibility toggles here in a real app */}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 bg-[#e2e8f0] overflow-hidden flex flex-col relative">
        <PdfPreview model={model} />
      </div>
    </div>
  );
}
