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
  const hasAreaWarning = occupiedArea > roofArea && roofArea > 0;

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

  const clearRoofImage = () => {
    setValue('roof_image_url', '', { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm">
        <div className="border-b border-brand-border bg-gradient-to-r from-brand-surface to-brand-gray px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-light">Local de instalação</p>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-brand-dark">Foto do telhado e planimetria</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Cadastre o local, envie a foto do telhado e posicione os módulos em strings coloridas para sair na proposta comercial.
              </p>
            </div>
            <div className="rounded-full border border-brand-border bg-brand-gray px-3 py-1 text-xs font-medium text-brand-light">
              {roofLayout.modules?.length || 0} módulos no layout
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <div className="md:col-span-2 rounded-xl border border-brand-border bg-brand-gray/70 p-4">
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg border border-brand-border bg-brand-surface p-3">
                  <p className="text-xs text-slate-500">Área por módulo</p>
                  <p className="mt-1 text-base font-semibold text-brand-dark">{formatArea(moduleArea)} m²</p>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-surface p-3">
                  <p className="text-xs text-slate-500">Área ocupada</p>
                  <p className="mt-1 text-base font-semibold text-brand-dark">{formatArea(occupiedArea)} m²</p>
                </div>
                <div className="rounded-lg border border-brand-border bg-brand-surface p-3">
                  <p className="text-xs text-slate-500">Status da área</p>
                  <p className={hasAreaWarning ? 'mt-1 text-sm font-semibold text-red-400' : 'mt-1 text-sm font-semibold text-emerald-400'}>
                    {areaStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-brand-border bg-brand-gray/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-brand-dark">Foto base do telhado</h3>
                <p className="mt-1 text-xs text-slate-500">Use uma foto aérea ou inclinada para encaixar os módulos.</p>
              </div>
              {roofImageUrl && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                  Foto ativa
                </span>
              )}
            </div>

            <div
              className="mt-4 flex min-h-[170px] items-center justify-center overflow-hidden rounded-xl border border-dashed border-brand-border bg-brand-surface text-center"
              style={{
                backgroundImage: roofImageUrl ? `linear-gradient(rgba(14,35,55,0.12), rgba(14,35,55,0.12)), url(${roofImageUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!roofImageUrl && (
                <div className="px-5 py-8">
                  <p className="text-sm font-medium text-brand-dark">Nenhuma foto enviada</p>
                  <p className="mt-1 text-xs text-slate-500">A imagem aparecerá aqui e no editor abaixo.</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                id="roof-photo-upload"
                type="file"
                accept="image/*"
                onChange={handleRoofPhotoUpload}
                disabled={isUploading}
                className="sr-only"
              />
              <label
                htmlFor="roof-photo-upload"
                className={`inline-flex h-10 flex-1 items-center justify-center rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
              >
                {isUploading ? 'Enviando foto...' : roofImageUrl ? 'Trocar foto' : 'Adicionar foto'}
              </label>
              {roofImageUrl && (
                <Button type="button" variant="outline" onClick={clearRoofImage}>
                  Remover
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <Label>URL da foto do telhado</Label>
              <Input
                {...register('roof_image_url')}
                placeholder="Cole uma URL pública ou envie pelo botão acima"
                error={errors.roof_image_url?.message}
              />
              <p className="text-xs text-slate-500">A imagem será usada como fundo da planimetria e também será exibida no PDF.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-sm">
        <div className="border-b border-brand-border px-5 py-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-light">Editor visual</p>
              <h3 className="mt-1 text-lg font-semibold text-brand-dark">Planimetria dos módulos e strings</h3>
              <p className="mt-1 text-sm text-slate-500">
                Arraste os módulos sobre a foto, organize as strings e use os pontos azuis para ajustar a perspectiva do SVG.
              </p>
            </div>
            <div className="rounded-xl border border-brand-border bg-brand-gray px-3 py-2 text-xs text-slate-500">
              Clique fora para desselecionar • Botão direito altera string
            </div>
          </div>
        </div>

        <div className="p-5">
          <RoofLayoutEditor
            value={roofLayout}
            roofImageUrl={roofImageUrl}
            moduleWidthM={moduleWidthM}
            moduleHeightM={moduleHeightM}
            onChange={(layout) => setValue('roof_layout_json', layout, { shouldDirty: true, shouldValidate: true })}
          />
        </div>
      </section>
    </div>
  );
}