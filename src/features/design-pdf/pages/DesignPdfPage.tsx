import { useEffect, useState } from 'react';
import { LayoutTemplate, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../../contexts/AuthContext';
import { pdfDesignService } from '../services/pdfDesignService';
import { PdfTemplatePreset, PdfUserModel } from '../types/pdfDesignTypes';
import { DesignPdfEditor } from '../components/DesignPdfEditor';
import { TemplateCarousel } from '../components/TemplateCarousel';
import { UserModelCarousel } from '../components/UserModelCarousel';

export function DesignPdfPage() {
  const { user } = useAuth();
  const [presets, setPresets] = useState<PdfTemplatePreset[]>([]);
  const [userModels, setUserModels] = useState<PdfUserModel[]>([]);
  const [editingModel, setEditingModel] = useState<PdfUserModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [userModelActiveIndex, setUserModelActiveIndex] = useState(0);

  useEffect(() => {
    if (userModelActiveIndex >= userModels.length && userModels.length > 0) {
      setUserModelActiveIndex(userModels.length - 1);
    } else if (userModels.length === 0) {
      setUserModelActiveIndex(0);
    }
  }, [userModels.length, userModelActiveIndex]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setPresets(pdfDesignService.getPresets());
      const models = await pdfDesignService.getUserModels(user.id);
      setUserModels(models);
    } catch (e) {
      toast.error('Erro ao carregar modelos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFromPreset = async (presetId: string) => {
    if (!user) return;
    try {
      const newModel = await pdfDesignService.createModelFromPreset(presetId, user.id);
      setUserModels((prev) => [...prev, newModel]);
      toast.success('Modelo adicionado com sucesso!');
      setEditingModel(newModel);
    } catch (e) {
      toast.error('Erro ao adicionar modelo');
    }
  };

  const handleDuplicate = async (modelId: string) => {
    if (!user) return;
    try {
      const newModel = await pdfDesignService.duplicateModel(modelId, user.id);
      setUserModels((prev) => [...prev, newModel]);
      toast.success('Modelo duplicado com sucesso!');
    } catch (e) {
      toast.error('Erro ao duplicar modelo');
    }
  };

  const handleDelete = async (modelId: string) => {
    try {
      await pdfDesignService.deleteModel(modelId);
      setUserModels((prev) => prev.filter((model) => model.id !== modelId));
      toast.success('Modelo excluído.');
    } catch (e) {
      toast.error('Erro ao excluir modelo');
    }
  };

  const handleSetDefault = async (modelId: string) => {
    try {
      await pdfDesignService.setDefaultModel(modelId);
      loadData();
      toast.success('Modelo definido como padrão.');
    } catch (e) {
      toast.error('Erro ao definir padrão');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
      </div>
    );
  }

  if (editingModel) {
    return (
      <DesignPdfEditor
        model={editingModel}
        onClose={() => setEditingModel(null)}
        onSave={() => {
          loadData();
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            <LayoutTemplate className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Modelos Padrão</h1>
            <p className="text-slate-500">Escolha um modelo base para criar o seu design personalizado.</p>
          </div>
        </div>

        <TemplateCarousel
          presets={presets}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          onAddFromPreset={handleAddFromPreset}
        />
      </section>

      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-primary/10 rounded-lg">
            <Star className="w-6 h-6 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">Meus Modelos</h1>
            <p className="text-slate-500">Gerencie seus modelos de PDF personalizados.</p>
          </div>
        </div>

        <UserModelCarousel
          userModels={userModels}
          activeIndex={userModelActiveIndex}
          onActiveIndexChange={setUserModelActiveIndex}
          onEdit={setEditingModel}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onSetDefault={handleSetDefault}
        />
      </section>
    </div>
  );
}
