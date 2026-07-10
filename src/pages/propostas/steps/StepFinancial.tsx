import { useFormContext, useWatch } from 'react-hook-form';
import { calcularPrecoProposta } from '../../../lib/calculations/pricing';
import { calcularSistemaSolar } from '../../../lib/calculations/solar';
import { calcularPayback } from '../../../lib/calculations/payback';
import { AlertCircle } from 'lucide-react';
import { PaybackChart } from '../../../components/charts/PaybackChart';

const formatNumber = (val: any) => {
  if (val === '' || val === null || val === undefined) return 0;
  return Number(val);
};

export function StepFinancial() {
  const { control } = useFormContext();
  
  const watchedValues = useWatch({
    control,
    name: [
      'kit_cost',
      'labor_cost',
      'fixed_costs',
      'freight_cost',
      'taxes',
      'commission',
      'other_costs',
      'margin_percentage',
      'discount_percentage',
      'hsp',
      'panel_power_w',
      'yield_factor',
      'generation_target_percent',
      'oversizing',
      'monthly_consumption_kwh',
      'bill_amount',
      'energy_tariff'
    ]
  });

  const [
    kit_cost, labor_cost, fixed_costs, freight_cost, 
    taxes, commission, other_costs, margin_percentage, discount_percentage,
    hsp, panel_power_w, yield_factor, generation_target_percent,
    oversizing, monthly_consumption_kwh, bill_amount, energy_tariff
  ] = watchedValues;

  const result = calcularPrecoProposta({
    kit_cost: formatNumber(kit_cost),
    labor_cost: formatNumber(labor_cost),
    fixed_costs: formatNumber(fixed_costs),
    freight_cost: formatNumber(freight_cost),
    taxes: formatNumber(taxes),
    commission: formatNumber(commission),
    other_costs: formatNumber(other_costs),
    margin_percentage: formatNumber(margin_percentage),
    discount_percentage: formatNumber(discount_percentage),
  });

  const calcSolar = calcularSistemaSolar({
    hsp: formatNumber(hsp) || 0,
    panel_power_w: formatNumber(panel_power_w) || 0,
    yield_factor: formatNumber(yield_factor) || 0.80,
    generation_target_percent: formatNumber(generation_target_percent) || 100,
    oversizing: formatNumber(oversizing) || 1.20,
    monthly_consumption_kwh: formatNumber(monthly_consumption_kwh) || undefined,
    current_bill_value: formatNumber(bill_amount) || undefined,
    energy_tariff: formatNumber(energy_tariff) || undefined,
  });

  const payback = calcSolar ? calcularPayback({
    investimentoTotal: result.final_price,
    economiaMensal: calcSolar.monthly_savings,
    economiaAnual: calcSolar.annual_savings,
  }) : null;

  const formatMoney = (val: number) => 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const marginWarning = result.real_margin_percentage < formatNumber(margin_percentage) && formatNumber(discount_percentage) > 0;

  return (
    <div className="space-y-6">
      <div className="p-4 border border-brand-border rounded-lg bg-gray-50">
        <h3 className="text-lg font-medium text-brand-dark mb-6">Detalhamento Financeiro</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-brand-border">
            <span className="text-slate-500">Custo Total (Kit + MO + Fixos + Frete + Impostos + Comissão + Outros)</span>
            <span className="text-brand-dark font-medium">
              {formatMoney(result.total_cost)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-brand-border">
            <span className="text-slate-500">Preço de Venda Bruto</span>
            <span className="text-brand-dark font-medium">
              {formatMoney(result.gross_price)}
            </span>
          </div>
          
          <div className="flex justify-between items-center py-2 border-b border-brand-border">
            <span className="text-slate-500">Desconto Aplicado ({formatNumber(discount_percentage)}%)</span>
            <span className="text-red-400 font-medium">
              - {formatMoney(result.discount_value)}
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-4">
            <span className="text-lg font-bold text-brand-dark">Preço de Venda Final</span>
            <span className="text-2xl font-bold text-brand-blue">
              {formatMoney(result.final_price)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-black/20 rounded-lg border border-brand-border">
              <span className="block text-sm text-slate-500 mb-1">Lucro Líquido Estimado</span>
              <span className="text-xl font-bold text-emerald-500">{formatMoney(result.estimated_profit)}</span>
            </div>
            
            <div className={`p-4 rounded-lg border ${marginWarning ? 'bg-red-50 border-red-100' : 'bg-black/20 border-brand-border'}`}>
              <span className="block text-sm text-slate-500 mb-1">Margem Líquida Real</span>
              <span className={`text-xl font-bold ${marginWarning ? 'text-red-400' : 'text-emerald-500'}`}>
                {result.real_margin_percentage.toFixed(2)}%
              </span>
            </div>
          </div>

          {marginWarning && (
            <div className="flex items-center gap-2 p-3 text-sm text-brand-blue bg-brand-blue/10 border border-brand-blue/20 rounded-md mt-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p>O desconto aplicado reduziu a margem real (lucro/venda) para abaixo da margem desejada inicialmente estipulada.</p>
            </div>
          )}
        </div>
      </div>

      {payback && payback.paybackAnos >= 0 && (
        <div className="p-4 border border-brand-border rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium text-brand-dark mb-6">Retorno do Investimento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-black/20 rounded-lg border border-brand-border">
              <span className="block text-sm text-slate-500 mb-1">Payback Simples</span>
              <span className="text-xl font-bold text-brand-dark">
                {payback.paybackFormatado}
              </span>
            </div>
            
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: payback.viability.backgroundColor,
                borderColor: payback.viability.borderColor,
              }}
            >
              <span className="block text-sm mb-1" style={{ color: payback.viability.color }}>Status do Investimento</span>
              <span className="text-xl font-bold" style={{ color: payback.viability.color }}>
                {payback.viability.label}
              </span>
              <p className="mt-2 text-xs" style={{ color: payback.viability.color }}>
                {payback.viability.description}
              </p>
            </div>
            
            <div className="p-4 bg-black/20 rounded-lg border border-brand-border">
              <span className="block text-sm text-slate-500 mb-1">Retorno em 25 anos (Acumulado)</span>
              <span className="text-xl font-bold text-emerald-500">
                {formatMoney(payback.retorno25Anos)}
              </span>
            </div>
          </div>
          
          <div className="mt-8">
            <h4 className="text-md font-medium text-brand-dark mb-2">Projeção de Retorno Financeiro</h4>
            <PaybackChart data={payback.tabelaRetorno} investimento={result.final_price} />
          </div>
        </div>
      )}
    </div>
  );
}
