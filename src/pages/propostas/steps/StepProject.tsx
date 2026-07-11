import { useFormContext } from 'react-hook-form';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import { ProposalFormValues } from '../../../lib/validations/proposal.schema';

export function StepProject() {
  const { register, formState: { errors } } = useFormContext<ProposalFormValues>();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-brand-dark mb-2">Dimensionamento Solar</h2>
        <p className="text-sm text-slate-500">
          Informe os parâmetros técnicos usados para calcular a potência, quantidade de módulos e geração estimada.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>CEP da Instalação</Label>
          <Input 
            {...register('cep')} 
            placeholder="00000-000" 
            error={errors.cep?.message}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Irradiação Solar HSP</Label>
          <Input 
            type="number" 
            step="0.01" 
            min="0"
            {...register('hsp')} 
            placeholder="Ex: 5.2" 
            error={errors.hsp?.message}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Potência do Módulo W</Label>
          <Input 
            type="number" 
            min="0"
            {...register('panel_power_w')} 
            placeholder="Ex: 550" 
            error={errors.panel_power_w?.message}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Fator de Rendimento (N)</Label>
          <Input 
            type="number" 
            step="0.01"
            min="0"
            max="1"
            {...register('yield_factor')} 
            placeholder="Ex: 0.80" 
            error={errors.yield_factor?.message}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Meta de Geração %</Label>
          <Input 
            type="number" 
            min="1"
            max="200"
            {...register('generation_target_percent')} 
            placeholder="Ex: 100" 
            error={errors.generation_target_percent?.message}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Oversizing DC/AC</Label>
          <Input 
            type="number" 
            step="0.01"
            min="0"
            {...register('oversizing')} 
            placeholder="Ex: 1.20" 
            error={errors.oversizing?.message}
          />
        </div>
      </div>
    </div>
  );
}
