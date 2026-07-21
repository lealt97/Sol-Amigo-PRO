import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Circle, MessageSquare, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { betaFeedbackService, BetaFeedbackCategory } from '../services/betaFeedbackService';
import { onboardingService, OnboardingStatus } from '../services/onboardingService';

const EMPTY_STATUS: OnboardingStatus = {
  company_complete: false,
  logo_complete: false,
  kit_complete: false,
  client_complete: false,
  completed_steps: 0,
  total_steps: 4,
  complete: false,
};

export function Onboarding() {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus>(EMPTY_STATUS);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackCategory, setFeedbackCategory] = useState<BetaFeedbackCategory>('onboarding');
  const [feedbackScore, setFeedbackScore] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const loadStatus = async () => {
    try {
      setIsLoading(true);
      setStatus(await onboardingService.getStatus());
    } catch (error) {
      console.error('Erro ao carregar onboarding:', error);
      toast.error('Não foi possível atualizar os primeiros passos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const steps = useMemo(() => [
    {
      key: 'company_complete' as const,
      title: 'Complete os dados da empresa',
      description: 'Cadastre nome, contato e endereço da sua operação.',
      to: '/configuracoes?tab=empresa',
      action: 'Configurar empresa',
    },
    {
      key: 'logo_complete' as const,
      title: 'Cadastre a identidade visual',
      description: 'Envie a logo principal e revise a apresentação da sua conta.',
      to: '/configuracoes?tab=logo',
      action: 'Adicionar logo',
    },
    {
      key: 'kit_complete' as const,
      title: 'Cadastre o primeiro kit solar',
      description: 'Registre os equipamentos e dados de referência sem executar cálculos de proposta.',
      to: '/kits-solares',
      action: 'Cadastrar kit',
    },
    {
      key: 'client_complete' as const,
      title: 'Cadastre o primeiro cliente',
      description: 'Organize os dados cadastrais e comerciais do cliente.',
      to: '/clientes/novo',
      action: 'Cadastrar cliente',
    },
  ], []);

  const percentage = Math.round((status.completed_steps / Math.max(status.total_steps, 1)) * 100);

  const handleFeedback = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (feedbackMessage.trim().length < 10) {
      toast.error('Descreva o feedback com pelo menos 10 caracteres.');
      return;
    }

    try {
      setIsSendingFeedback(true);
      await betaFeedbackService.submit({
        accountId: user.id,
        category: feedbackCategory,
        score: feedbackScore ? Number(feedbackScore) : null,
        message: feedbackMessage,
        context: {
          onboarding_completed_steps: status.completed_steps,
          onboarding_complete: status.complete,
          route: window.location.pathname,
        },
      });
      setFeedbackMessage('');
      setFeedbackScore('');
      toast.success('Feedback registrado. Obrigado por participar do beta.');
    } catch (error) {
      console.error('Erro ao enviar feedback beta:', error);
      toast.error('Não foi possível registrar o feedback.');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <section className="overflow-hidden rounded-3xl border border-brand-border bg-brand-surface shadow-sm">
        <div className="bg-gradient-to-r from-brand-blue/15 via-brand-surface to-brand-yellow/10 px-6 py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-blue">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-[0.18em]">Primeiros passos</span>
              </div>
              <h1 className="mt-2 text-2xl font-bold text-brand-dark">Configure sua conta SolAmigo</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                O gerador de propostas e os cálculos foram removidos. Este progresso considera apenas empresa, identidade visual, kits e clientes.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => void loadStatus()} disabled={isLoading} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar progresso
            </Button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-brand-dark">{status.completed_steps} de {status.total_steps} etapas</span>
              <span className="font-bold text-brand-blue">{percentage}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-brand-gray">
              <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${percentage}%` }} />
            </div>
          </div>
        </div>
      </section>

      {status.complete && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-800">
          <p className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-5 w-5" /> Configuração inicial concluída</p>
          <p className="mt-1 text-sm">Os cadastros básicos da conta foram concluídos.</p>
        </div>
      )}

      <div className="grid gap-4">
        {steps.map((step, index) => {
          const complete = status[step.key];
          return (
            <Card key={step.key} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${complete ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-blue/10 text-brand-blue'}`}>
                    {complete ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-black">{index + 1}</span>}
                  </div>
                  <div>
                    <h2 className="font-bold text-brand-dark">{step.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
                    <p className={`mt-2 flex items-center gap-1 text-xs font-semibold ${complete ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                      {complete ? 'Concluído' : 'Pendente'}
                    </p>
                  </div>
                </div>
                <Link to={step.to} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 text-sm font-bold text-white hover:bg-brand-blue-hover">
                  {complete ? 'Revisar' : step.action} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-blue" />
          <h2 className="text-lg font-bold text-brand-dark">Feedback do beta</h2>
        </div>
        <p className="mt-2 text-sm text-slate-500">Registre dificuldades, erros e sugestões. Não envie senhas, documentos pessoais, dados de cartão ou segredos de autenticação.</p>

        <form onSubmit={handleFeedback} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-brand-dark">Categoria</label>
              <select value={feedbackCategory} onChange={(event) => setFeedbackCategory(event.target.value as BetaFeedbackCategory)} className="mt-2 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm">
                <option value="onboarding">Primeiros passos</option>
                <option value="billing">Planos e cobrança</option>
                <option value="usability">Usabilidade</option>
                <option value="bug">Erro</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-brand-dark">Nota opcional — 0 a 10</label>
              <input type="number" min="0" max="10" value={feedbackScore} onChange={(event) => setFeedbackScore(event.target.value)} className="mt-2 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-brand-dark">Mensagem</label>
            <textarea value={feedbackMessage} onChange={(event) => setFeedbackMessage(event.target.value)} rows={5} maxLength={5000} className="mt-2 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm" placeholder="Conte o que aconteceu, o que você esperava e em qual área estava." />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSendingFeedback}>{isSendingFeedback ? 'Enviando...' : 'Enviar feedback'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
