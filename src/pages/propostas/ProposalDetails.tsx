import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FileText, User } from 'lucide-react';
import { ProposalDeliveryPanel } from '../../components/proposals/ProposalDeliveryPanel';
import { proposalService } from '../../services/proposalService';
import { proposalEventService } from '../../services/proposalEventService';
import type { Proposal } from '../../types/proposal';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';
import { getProposalContinuePath, isActiveProposalFlowDraft } from '../../lib/proposals/flow';
import { getProposalStatusPresentation } from '../../lib/proposals/presentation';

export function ProposalDetails() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProposal = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const proposalData = await proposalService.getProposalById(id);
      setProposal(proposalData);

      if (!isActiveProposalFlowDraft(proposalData)) {
        setEvents(await proposalEventService.getEvents(id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes da proposta');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProposal();
  }, [loadProposal]);

  if (isLoading) {
    return <div className="animate-pulse text-brand-blue">Carregando detalhes...</div>;
  }

  if (error || !proposal) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-brand-dark">Erro</h2>
        <p className="mb-6 text-red-500">{error || 'Proposta não encontrada.'}</p>
        <Link to="/propostas"><Button variant="outline">Voltar para Propostas</Button></Link>
      </div>
    );
  }

  if (isActiveProposalFlowDraft(proposal)) {
    return <Navigate to={getProposalContinuePath(proposal.id)} replace />;
  }

  const statusPresentation = getProposalStatusPresentation(proposal.status);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex items-start gap-3 border-b border-brand-border pb-5">
        <Link to="/propostas">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{proposal.title || 'Proposta sem título'}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{proposal.code ? `Código: ${proposal.code}` : 'Sem código'}</span>
            <span aria-hidden="true">·</span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs ${statusPresentation.className}`}
              title={statusPresentation.description}
            >
              {statusPresentation.label}
            </span>
          </div>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-brand-light/30 bg-brand-blue/10 p-4 text-brand-dark">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
        <div>
          <p className="font-semibold">Etapa final da proposta</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Os cálculos foram preservados. Agora escolha o modelo do PDF, gere o documento e envie o link público ao cliente.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-brand-blue" /> Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-semibold text-brand-dark">{proposal.client?.name || 'Cliente não disponível'}</p>
              <p className="text-slate-500">{proposal.client?.document || 'Sem documento'}</p>
              <p className="text-slate-500">{proposal.client?.phone || 'Sem telefone'}</p>
              <p className="text-slate-500">{proposal.client?.email || 'Sem e-mail'}</p>
              <Link to={`/clientes/${proposal.client_id}`} className="block pt-2">
                <Button variant="outline" className="w-full">Ver ficha do cliente</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-brand-blue" /> Histórico</CardTitle>
              <CardDescription>Eventos de envio, visualização, aceite ou recusa.</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">Nenhum evento registrado.</p>
              ) : (
                <div className="space-y-5">
                  {events.map((event) => (
                    <div key={event.id} className="border-l-2 border-brand-blue pl-4">
                      <p className="text-sm font-semibold text-brand-dark">{event.description || event.event_type}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(event.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ProposalDeliveryPanel proposal={proposal} onProposalChange={setProposal} />
      </div>
    </div>
  );
}
