import { useFormContext, useWatch } from 'react-hook-form';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { ProposalFormValues } from '../../../lib/validations/proposal.schema';

export function StepProject() {
  const { register, control, formState: { errors } } = useFormContext<ProposalFormValues>();
  const selectedKitSnapshot = useWatch({ control, name: 'solar_kit_snapshot' }) as any;
  const watchedSystemType = useWatch({ control, name: 'system_type' });
  const systemType = watchedSystemType || selectedKitSnapshot?.system_type || 'on_grid';
  const hasStorage = systemType === 'hybrid' || systemType === 'off_grid';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark mb-2">Dimensionamento Solar</h2>
        <p className="text-sm text-slate-500">
          Informe os parâmetros técnicos usados para calcular a potência, quantidade de módulos e geração estimada.
        </p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="system_type">Tipo de Sistema</Label>
          <select
            id="system_type"
            {...register('system_type')}
            defaultValue={systemType}
            className="flex h-10 w-full rounded-md border border-brand-border bg-gray-50 px-3 py-2 text-sm text-brand-dark outline-none ring-offset-brand-gray transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
          >
            <option value="on_grid">On-grid</option>
            <option value="hybrid">Híbrido com baterias</option>
            <option value="off_grid">Off-grid</option>
          </select>
          <p className="text-xs text-slate-500">
            Para híbrido/off-grid, o PDF destacará banco de baterias, backup e autonomia estimada.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CEP da Instalação</Label>
          <Input {...register('cep')} placeholder="00000-000" error={errors.cep?.message} />
        </div>
        
        <div className="space-y-2">
          <Label>Irradiação Solar HSP</Label>
          <Input type="number" step="0.01" min="0" {...register('hsp')} placeholder="Ex: 5.2" error={errors.hsp?.message} />
        </div>
        
        <div className="space-y-2">
          <Label>Potência do Módulo W</Label>
          <Input type="number" min="0" {...register('panel_power_w')} placeholder="Ex: 550" error={errors.panel_power_w?.message} />
        </div>
        
        <div className="space-y-2">
          <Label>Fator de Rendimento (N)</Label>
          <Input type="number" step="0.01" min="0" max="1" {...register('yield_factor')} placeholder="Ex: 0.80" error={errors.yield_factor?.message} />
        </div>
        
        <div className="space-y-2">
          <Label>Meta de Geração %</Label>
          <Input type="number" min="1" max="200" {...register('generation_target_percent')} placeholder="Ex: 100" error={errors.generation_target_percent?.message} />
        </div>
        
        <div className="space-y-2">
          <Label>Oversizing DC/AC</Label>
          <Input type="number" step="0.01" min="0" {...register('oversizing')} placeholder="Ex: 1.20" error={errors.oversizing?.message} />
        </div>
      </div>

      {hasStorage && (
        <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-brand-dark">Bateria, Backup e Autonomia</h3>
            <p className="mt-1 text-xs text-slate-500">
              Use estes campos para propostas híbridas/off-grid. Eles podem ser preenchidos automaticamente ao selecionar um kit híbrido.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Capacidade total da bateria (kWh)</Label>
              <Input type="number" step="0.01" min="0" {...register('battery_capacity_kwh')} placeholder="Ex: 10" />
            </div>
            <div className="space-y-2">
              <Label>Capacidade útil da bateria (kWh)</Label>
              <Input type="number" step="0.01" min="0" {...register('usable_battery_capacity_kwh')} placeholder="Ex: 8" />
            </div>
            <div className="space-y-2">
              <Label>Potência de backup (kW)</Label>
              <Input type="number" step="0.01" min="0" {...register('backup_power_kw')} placeholder="Ex: 5" />
            </div>
            <div className="space-y-2">
              <Label>Autonomia estimada (horas)</Label>
              <Input type="number" step="0.1" min="0" {...register('autonomy_hours')} placeholder="Ex: 4" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Cargas essenciais atendidas</Label>
              <Input {...register('essential_loads_description')} placeholder="Geladeira, iluminação, internet, portão, câmeras..." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
