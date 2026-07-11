import { useEffect, useMemo } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Label } from '../../../components/ui/Label';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { calcularPrecoProposta } from '../../../lib/calculations/pricing';
import { ProposalFormValues } from '../../../lib/validations/proposal.schema';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';

const formatNumber = (val: any) => {
  if (val === '' || val === null || val === undefined) return 0;
  const parsed = Number(val);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number) => Number(value.toFixed(2));

export function StepCosts() {
  const { register, control, setValue } = useFormContext<ProposalFormValues>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'additional_costs',
  });

  const watchedValues = useWatch({
    control,
    name: [
      'kit_cost',
      'labor_cost',
      'fixed_costs',
      'freight_cost',
      'taxes',
      'commission',
      'margin_percentage',
      'discount_percentage'
    ]
  });

  const additionalCosts = useWatch({ control, name: 'additional_costs' }) || [];

  const [
    kit_cost, labor_cost, fixed_costs, freight_cost,
    taxes, commission, margin_percentage, discount_percentage
  ] = watchedValues;

  const additionalCostsTotal = useMemo(() => {
    return roundMoney(
      additionalCosts.reduce((sum, item) => sum + Math.max(0, formatNumber(item?.amount)), 0)
    );
  }, [additionalCosts]);

  useEffect(() => {
    setValue('other_costs', additionalCostsTotal > 0 ? additionalCostsTotal : '', {
      shouldDirty: true,
      shouldValidate: false,
    });
  }, [additionalCostsTotal, setValue]);

  const result = calcularPrecoProposta({
    kit_cost: formatNumber(kit_cost),
    labor_cost: formatNumber(labor_cost),
    fixed_costs: formatNumber(fixed_costs),
    freight_cost: formatNumber(freight_cost),
    taxes: formatNumber(taxes),
    commission: formatNumber(commission),
    other_costs: additionalCostsTotal,
    margin_percentage: formatNumber(margin_percentage),
    discount_percentage: formatNumber(discount_percentage),
  });

  const formatMoney = (val: number) => 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const marginWarning = result.real_margin_percentage < formatNumber(margin_percentage) && formatNumber(discount_percentage) > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-brand-dark">Custos principais</h3>
          <p className="text-xs text-slate-500 mt-1">
            Informe os custos fixos da proposta. Custos extras podem ser adicionados abaixo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="kit_cost">Custo do Kit (R$)</Label>
            <Input
              id="kit_cost"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('kit_cost')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="labor_cost">Mão de Obra (R$)</Label>
            <Input
              id="labor_cost"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('labor_cost')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fixed_costs">Custos Fixos (R$)</Label>
            <Input
              id="fixed_costs"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('fixed_costs')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="freight_cost">Frete (R$)</Label>
            <Input
              id="freight_cost"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('freight_cost')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxes">Impostos (R$)</Label>
            <Input
              id="taxes"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('taxes')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commission">Comissão (R$)</Label>
            <Input
              id="commission"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('commission')}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-brand-border pt-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-medium text-brand-dark">Custos adicionais</h3>
            <p className="text-xs text-slate-500 mt-1">
              Adicione linhas como deslocamento, ART, projeto, homologação, içamento ou materiais extras.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: '', amount: '' })}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Custo
          </Button>
        </div>

        <input type="hidden" {...register('other_costs')} />

        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-brand-border bg-brand-surface p-4 text-sm text-slate-500">
            Nenhum custo adicional informado. Clique em <strong>+ Adicionar Custo</strong> para incluir custos extras.
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_180px_44px] gap-3 items-end rounded-lg border border-brand-border bg-gray-50 p-3">
                <div className="space-y-2">
                  <Label htmlFor={`additional_costs.${index}.description`}>Descrição do custo</Label>
                  <Input
                    id={`additional_costs.${index}.description`}
                    placeholder="Ex: ART, homologação, deslocamento"
                    {...register(`additional_costs.${index}.description` as const)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`additional_costs.${index}.amount`}>Valor (R$)</Label>
                  <Input
                    id={`additional_costs.${index}.amount`}
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register(`additional_costs.${index}.amount` as const)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-400 hover:bg-red-50"
                  aria-label="Remover custo adicional"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center rounded-lg bg-brand-surface border border-brand-border p-4">
          <span className="text-slate-500">Total dos custos adicionais</span>
          <span className="font-bold text-brand-dark">{formatMoney(additionalCostsTotal)}</span>
        </div>
      </div>

      <div className="border-t border-brand-border pt-6">
        <h3 className="text-sm font-medium text-brand-dark mb-4">Margem e Desconto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="margin_percentage">Margem Desejada (%)</Label>
            <Input
              id="margin_percentage"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('margin_percentage')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount_percentage">Desconto (%)</Label>
            <Input
              id="discount_percentage"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register('discount_percentage')}
            />
          </div>
        </div>
      </div>

      <div className="border border-brand-border rounded-lg bg-brand-surface overflow-hidden">
        <div className="bg-gray-50 border-b border-brand-border p-4 flex justify-between items-center">
          <h3 className="font-medium text-brand-dark">Resumo Financeiro</h3>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Custo Total</span>
            <span className="text-brand-dark font-medium">{formatMoney(result.total_cost)}</span>
          </div>

          {additionalCostsTotal > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Custos adicionais</span>
              <span className="text-brand-dark font-medium">{formatMoney(additionalCostsTotal)}</span>
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Preço de Venda Bruto</span>
            <span className="text-brand-dark font-medium">{formatMoney(result.gross_price)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Desconto</span>
            <span className="text-red-400 font-medium">- {formatMoney(result.discount_value)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-brand-border">
            <span className="text-brand-dark font-medium">Preço Final</span>
            <span className="text-xl font-bold text-brand-dark">{formatMoney(result.final_price)}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-border">
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="block text-xs text-slate-500 mb-1">Lucro Estimado</span>
              <span className="text-lg font-bold text-emerald-500">{formatMoney(result.estimated_profit)}</span>
            </div>
            
            <div className={`p-3 rounded-lg ${marginWarning ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
              <span className="block text-xs text-slate-500 mb-1">Margem Real</span>
              <span className={`text-lg font-bold ${marginWarning ? 'text-red-400' : 'text-emerald-500'}`}>
                {result.real_margin_percentage.toFixed(2)}%
              </span>
            </div>
          </div>
          
          {marginWarning && (
            <div className="flex items-center gap-2 p-3 text-sm text-brand-blue bg-brand-blue/10 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>Atenção: O desconto aplicado reduziu a margem real para abaixo da margem desejada ({formatNumber(margin_percentage)}%).</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
