import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, Copy, Download, FileText, Link as LinkIcon, User } from 'lucide-react';
import { proposalService } from '../../services/proposalService';
import { proposalEventService } from '../../services/proposalEventService';
import { Proposal } from '../../types/proposal';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';

const getStatusLabel = (status: string) => ({
  draft: 'Pendente',
  pending: 'Pendente',
  sent: 'Enviada',
  viewed: 'Visualizada',
  accepted: 'Aprovada',
  approved: 'Aprovada',
  rejected: 'Recusada',
  expired: 'Expirada',
}[status] || status);

export function ProposalDetails() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProposal() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [proposalData, eventData] = await Promise.all([
          proposalService.getProposalById(id),
          proposalEventService.getEvents(id),
        ]);
        setProposal(proposalData);
        setEvents(eventData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes da proposta');
      } finally {
        setIsLoading(false);
      }
    }

    void loadProposal();
  }, [id]);

  const copyPublicLink = async () => {
    if (!proposal?.public_token) return;
    const link = `${window.location.origin}/proposta/${proposal.public_token}`;
    await navigator.clipboard.writeText(link);
    toast.success('Link copiado.');
  };

  if (isLoading) {
    return <div className="text-brand-blue animate-pulse">Carregando detalhes...</div>;
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

  const publicLink = proposal.public_token
    ? `${window.location.origin}/proposta/${proposal.public_token}`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex items-start gap-3 border-b border-brand-border pb-5">
        <Link to="/propostas">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{proposal.title || 'Proposta sem título'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {proposal.code ? `Código: ${proposal.code}` : 'Sem código'} · {getStatusLabel(proposal.status)}
          </p>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Registro histórico em modo somente leitura</p>
          <p className="mt-1 text-sm">
            O Wizard, a edição, a duplicação, a geração de novos PDFs e os cálculos foram removidos. Nenhum valor técnico ou financeiro é recalculado nesta tela.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-brand-blue" />Cliente</CardTitle>
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
              <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-brand-blue" />Documento existente</CardTitle>
              <CardDescription>Nenhum PDF novo será gerado.</CardDescription>
            </CardHeader>
            <CardContent>
              {proposal.pdf_url ? (
                <Button onClick={() => window.open(proposal.pdf_url || '', '_blank')} className="w-full gap-2">
                  <Download className="h-4 w-4" />Abrir PDF existente
                </Button>
              ) : (
                <p className="text-sm text-slate-500">Esta proposta não possui PDF armazenado.</p>
              )}
            </CardContent>
          </Card>

          {publicLink && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><LinkIcon className="h-5 w-5 text-brand-blue" />Link público existente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="break-all text-xs text-slate-500">{publicLink}</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => void copyPublicLink()}><Copy className="h-4 w-4" />Copiar</Button>
                  <Button className="flex-1" onClick={() => window.open(publicLink, '_blank')}>Abrir</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Histórico da proposta</CardTitle>
            <CardDescription>Eventos preservados sem permitir edição do conteúdo da proposta.</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Nenhum evento registrado.</p>
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
    </div>
  );
}
