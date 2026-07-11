import { ChangeEvent, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { Select } from '../../../components/ui/Select';
import { RoofLayoutEditor } from '../../../components/roof/RoofLayoutEditor';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase/client';
import { ProposalFormValues } from '../../../lib/validations/proposal.schema';
import { EMPTY_ROOF_LAYOUT, RoofLayoutData } from '../../../types/roofLayout';

const toNumber = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatArea = (value: number) =>
  value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function StepInstallation() {
  const { user } = useAuth();
  const { register, watch, setValue, formState: { errors } } = useFormContext<ProposalFormValues>();
  const [isUploading, setIsUploading] = useState(false);

  const roofImageUrl = watch('roof_image_url') || '';
  const moduleWidthM = toNumber(watch('module_width_m')) || 1.13;
  const moduleHeightM = toNumber(watch('module_height_m')) || 2.28;
  const roofLayout = (watch('roof_layout_json') as RoofLayoutData | undefined) || EMPTY_ROOF_LAYOUT;
  const moduleArea = moduleWidthM * moduleHeightM;
  const occupiedArea = (roofLayout.modules?.length || 0) * moduleArea;
  const roofArea = toNumber(watch('roof_area_m2'));

  const areaStatus = useMemo(() => {
    if (!roofArea || !occupiedArea) return 'Informe a área e posicione os módulos para comparar ocupação.';
    if (occupiedArea <= roofArea) return 'Área útil aparentemente suficiente para o layout informado.';
    return 'A área ocupada estimada ultrapassa a área útil informada.';
  }, [occupiedArea, roofArea]);

  const handleRoofPhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast.error('Faça login para enviar a imagem do telhado.');
      return;
    }

    try {
      setIsUploading(true);
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '-');
      const filePath = `${user.id}/roof-photos/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage.from('proposals').upload(filePath, file, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });

      if (error) throw error;

      const { data } = supabase.storage.from('proposals').getPublicUrl(filePath);
      setValue('roof_image_url', data.publicUrl, { shouldDirty: true, shouldValidate: true });
      toast.success('Foto do telhado enviada.');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao enviar a foto do telhado.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark mb-2">Local de Instalação</h2>
        <p className="text-sm text-slate-500">
          Cadastre as características do telhado/local, envie a foto e posicione os módulos em strings coloridas para aparecer no PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Telhado / Local</Label>
          <Select {...register('roof_type')}>
            <option value="">Selecione o tipo de telhado</option>
            <option value="Telhado cerâmico">Telhado cerâmico</option>
            <option value="Telhado metálico">Telhado metálico</option>
            <option value="Telhado de fibrocimento">Telhado de fibrocimento</option>
            <option value="Laje">Laje</option>
            <option value="Solo / estrutura própria">Solo / estrutura própria</option>
            <option value="Garagem / carport">Garagem / carport</option>
            <option value="Outro">Outro</option>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Área útil disponível m²</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('roof_area_m2')}
            placeholder="Ex: 48"
            error={errors.roof_area_m2?.message}
          />
        </div>

        <div className="space-y-2">
          <Label>Largura do módulo m</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('module_width_m')}
            placeholder="Ex: 1.13"
            error={errors.module_width_m?.message}
          />
        </div>

        <div className="space-y-2">
          <Label>Altura do módulo m</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('module_height_m')}
            placeholder="Ex: 2.28"
            error={errors.module_height_m?.message}
          />
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-gray-50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-slate-500">Área por módulo</p>
            <p className="font-semibold text-brand-dark">{formatArea(moduleArea)} m²</p>
          </div>
          <div>
            <p className="text-slate-500">Área ocupada no layout</p>
            <p className="font-semibold text-brand-dark">{formatArea(occupiedArea)} m²</p>
          </div>
          <div>
            <p className="text-slate-500">Status da área</p>
            <p className={occupiedArea > roofArea && roofArea > 0 ? 'font-semibold text-red-600' : 'font-semibold text-emerald-700'}>
              {areaStatus}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="space-y-2 flex-1">
            <Label>Foto do telhado</Label>
            <Input type="file" accept="image/*" onChange={handleRoofPhotoUpload} disabled={isUploading} />
          </div>
          <Button type="button" variant="outline" isLoading={isUploading} disabled>
            {isUploading ? 'Enviando...' : 'Upload pelo Supabase'}
          </Button>
        </div>

        <div className="space-y-2">
          <Label>URL da foto do telhado</Label>
          <Input
            {...register('roof_image_url')}
            placeholder="Cole uma URL pública da imagem, ou envie pelo campo acima"
            error={errors.roof_image_url?.message}
          />
          <p className="text-xs text-slate-500">
            A imagem será usada como fundo da planimetria e também será exibida no PDF.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-brand-dark">Planimetria dos módulos e strings</h3>
          <p className="text-sm text-slate-500">
            Arraste os módulos sobre a foto, organize as strings e escolha uma cor para cada conjunto.
          </p>
        </div>

        <RoofLayoutEditor
          value={roofLayout}
          roofImageUrl={roofImageUrl}
          moduleWidthM={moduleWidthM}
          moduleHeightM={moduleHeightM}
          onChange={(layout) => setValue('roof_layout_json', layout, { shouldDirty: true, shouldValidate: true })}
        />
      </div>
    </div>
  );
}
