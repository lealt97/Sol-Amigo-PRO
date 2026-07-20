import { useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { billingService, BillingInterval } from '../services/billingService';
import { formatCurrencyFromCents, PRO_ANNUAL, PRO_MONTHLY } from '../lib/billing/planCatalog';

export function BillingCheckout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isStarting, setIsStarting] = useState(false);

  const interval: BillingInterval = searchParams.get('interval') === 'year' ? 'year' : 'month';
  const plan = interval === 'year' ? PRO_ANNUAL : PRO_MONTHLY;
  const intervalLabel = interval === 'year' ? 'anual' : 'mensal';

  const priceLabel = useMemo(() => {
    if (interval === 'year') {
      return `${formatCurrencyFromCents(plan.priceCents)} por ano`;
    }
    return `${formatCurrencyFromCents(plan.priceCents)} por mês`;
  }, [interval, plan.priceCents]);

  const handleCheckout = async () => {
    try {
      setIsStarting(true);
      const checkout = await billingService.startCheckout(interval);
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível iniciar o checkout.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        type="button"
        onClick={() => navigate('/planos')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos planos
      </button>

      <section className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface shadow-xl">
        <div className="border-b border-brand-border bg-gradient-to-r from-brand-surface to-brand-gray px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-light">Checkout seguro</p>
          <h1 className="mt-2 text-2xl font-bold text-brand-dark">Assinar o plano Pro {intervalLabel}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Confirme a opção escolhida antes de continuar para o ambiente protegido do provedor de pagamento.
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-xl border border-brand-border bg-brand-gray/70 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-brand-dark">SolAmigo Pro {intervalLabel}</p>
                <p className="mt-1 text-sm text-slate-500">Até {plan.limits.proposalsPerMonth} propostas por mês.</p>
              </div>
              <p className="text-xl font-bold text-brand-dark">{priceLabel}</p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-brand-dark">Pagamento processado fora do navegador do SolAmigo</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                O SolAmigo não recebe nem armazena os dados do seu cartão. A ativação do plano ocorre somente após a confirmação assinada do provedor.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleCheckout}
            disabled={isStarting}
            className="w-full"
          >
            {isStarting ? 'Preparando checkout...' : (
              <span className="inline-flex items-center gap-2">
                Continuar para pagamento <ExternalLink className="h-4 w-4" />
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-slate-500">
            O botão reutiliza uma tentativa recente para impedir cobranças ou sessões duplicadas durante reenvios.
          </p>
        </div>
      </section>
    </div>
  );
}
