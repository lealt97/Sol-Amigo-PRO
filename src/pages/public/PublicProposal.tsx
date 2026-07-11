import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useParams } from 'react-router-dom';
import { publicProposalService } from '../../services/publicProposalService';
import { Button } from '../../components/ui/Button';
import { FileText, CheckCircle, XCircle, Clock, Zap, DollarSign, PiggyBank, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { extractActiveLogo } from '../../utils/logoHelper';

export function PublicProposal() {
  const { publicToken } = useParams<{ publicToken: string }>();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    async function loadProposal() {
      if (!publicToken) {
        setError('Token inválido');
        setLoading(false);
        return;
      }
      
      try {
        const data = await publicProposalService.getProposalByToken(publicToken);
        if (!data) {
          setError('Proposta não encontrada');
        } else {
          setProposal(data);
        }
      } catch (err: any) {
        console.error(err);
        setError('Não foi possível carregar a proposta.');
      } finally {
        setLoading(false);
      }
    }
    
    loadProposal();
  }, [publicToken]);

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!publicToken) return;
    setProcessing(true);
    try {
      await publicProposalService.updateStatus(publicToken, status, status === 'rejected' ? rejectReason : undefined, proposal?.id);
      // Reload proposal to get new status
      const data = await publicProposalService.getProposalByToken(publicToken);
      setProposal(data);
      if (status === 'approved') {
        toast.success('Proposta aceita com sucesso!');
      } else {
        toast('Proposta recusada.');
      }
      setShowRejectReason(false);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar sua resposta. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-gray flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
        <p className="text-slate-500">Carregando proposta...</p>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-brand-gray flex flex-col items-center justify-center p-4">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-brand-dark mb-2">Ops!</h1>
          <p className="text-slate-500">{error || 'Proposta não encontrada'}</p>
        </div>
      </div>
    );
  }

  // Permite aceitar se for 'pending', 'sent' ou 'draft' (para facilitar os testes)
  const canAct = ['pending', 'sent', 'draft', 'viewed'].includes(proposal.status);
  
  // Format numbers
  const power = proposal.solar?.installed_power_kwp || 0;
  const savings = proposal.solar?.estimated_monthly_savings || 0;
  const payback = proposal.solar?.payback_time_years || 0;

  return (
    <div className="min-h-screen bg-brand-gray py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Header / Logo */}
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          {extractActiveLogo(proposal.company?.logo_url || null) ? (
            <img src={extractActiveLogo(proposal.company.logo_url)!} alt={proposal.company.name} className="h-16 object-contain" />
          ) : (
            <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
              <Zap className="w-8 h-8 text-brand-dark" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-brand-dark">{proposal.company?.name || 'Aero Energia Solar'}</h1>
        </div>

        {/* Card Principal */}
        <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden shadow-2xl">
          <div className="p-6 sm:p-8 border-b border-brand-border">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">
                  Proposta Comercial
                </h2>
                <h3 className="text-xl sm:text-2xl font-bold text-brand-dark">
                  {proposal.title || 'Sistema de Energia Solar Fotovoltaica'}
                </h3>
              </div>
              
              {/* Status Badge */}
              <div className="hidden sm:block">
                {proposal.status === 'approved' || proposal.status === 'accepted' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle className="w-3 h-3 mr-1" /> Aprovada
                  </span>
                ) : proposal.status === 'rejected' ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100">
                    <XCircle className="w-3 h-3 mr-1" /> Recusada
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                    <Clock className="w-3 h-3 mr-1" /> Aguardando Avaliação
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Cliente</p>
                <p className="text-base font-medium text-brand-dark">{proposal.client?.name}</p>
                {(proposal.client?.city && proposal.client?.state) && (
                  <p className="text-sm text-slate-500">{proposal.client.city} - {proposal.client.state}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500">Código da Proposta</p>
                <p className="text-base font-medium text-brand-dark">{proposal.code || proposal.id.substring(0, 8).toUpperCase()}</p>
                <p className="text-sm text-slate-500">Emitida em {new Date(proposal.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-brand-surface">
            <h4 className="text-lg font-medium text-brand-dark mb-6">Resumo do Sistema</h4>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-brand-gray p-4 rounded-lg border border-brand-border">
                <Zap className="w-5 h-5 text-brand-blue mb-2" />
                <p className="text-xs text-slate-500 mb-1">Potência</p>
                <p className="text-lg font-bold text-brand-dark">{power.toFixed(2)} kWp</p>
              </div>
              
              <div className="bg-brand-gray p-4 rounded-lg border border-brand-border">
                <DollarSign className="w-5 h-5 text-blue-400 mb-2" />
                <p className="text-xs text-slate-500 mb-1">Investimento</p>
                <p className="text-lg font-bold text-brand-dark">{formatCurrency(proposal.final_price || 0)}</p>
              </div>
              
              <div className="bg-brand-gray p-4 rounded-lg border border-brand-border">
                <TrendingDown className="w-5 h-5 text-emerald-700 mb-2" />
                <p className="text-xs text-slate-500 mb-1">Economia Mensal</p>
                <p className="text-lg font-bold text-brand-dark">{formatCurrency(savings)}</p>
              </div>
              
              <div className="bg-brand-gray p-4 rounded-lg border border-brand-border">
                <PiggyBank className="w-5 h-5 text-purple-400 mb-2" />
                <p className="text-xs text-slate-500 mb-1">Payback</p>
                <p className="text-lg font-bold text-brand-dark">{payback.toFixed(1)} anos</p>
              </div>
            </div>
            
            {/* View PDF Button */}
            <div className="flex justify-center mb-8">
              {proposal.pdf_url ? (
                <a 
                  href={proposal.pdf_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-300 text-brand-dark rounded-lg font-medium transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  Visualizar Proposta Completa (PDF)
                </a>
              ) : (
                <p className="text-slate-500 text-sm">O PDF desta proposta não está disponível no momento.</p>
              )}
            </div>

            {/* Actions */}
            {canAct ? (
              <div className="border-t border-brand-border pt-8">
                {showRejectReason ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-brand-dark mb-2">Por favor, nos informe o motivo da recusa (opcional):</p>
                    <textarea 
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      className="w-full bg-brand-gray border border-brand-border rounded-lg p-3 text-brand-dark focus:outline-none focus:border-[#3B82F6]"
                      rows={3}
                      placeholder="Ex: Achei o valor alto, fechei com concorrente, decidi adiar..."
                    />
                    <div className="flex gap-4 justify-end">
                      <Button variant="outline" onClick={() => setShowRejectReason(false)} disabled={processing}>
                        Cancelar
                      </Button>
                      <Button variant="destructive" onClick={() => handleAction('rejected')} disabled={processing}>
                        Confirmar Recusa
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowRejectReason(true)}
                      className="flex-1 sm:flex-none border-red-500/30 text-red-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                      disabled={processing}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Recusar Proposta
                    </Button>
                    <Button 
                      onClick={() => handleAction('approved')}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={processing}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aceitar Proposta
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="border-t border-brand-border pt-8 text-center">
                {proposal.status === 'approved' || proposal.status === 'accepted' ? (
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 p-6 rounded-lg inline-block w-full">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                    <h4 className="font-bold text-lg mb-1">Proposta Aceita</h4>
                    <p className="text-sm">Você aceitou esta proposta em {new Date(proposal.accepted_at).toLocaleString('pt-BR')}. Em breve entraremos em contato!</p>
                  </div>
                ) : proposal.status === 'rejected' ? (
                  <div className="bg-red-50 text-red-600 border border-red-100 p-6 rounded-lg inline-block w-full">
                    <XCircle className="w-8 h-8 mx-auto mb-2" />
                    <h4 className="font-bold text-lg mb-1">Proposta Recusada</h4>
                    <p className="text-sm">Você recusou esta proposta em {new Date(proposal.rejected_at).toLocaleString('pt-BR')}.</p>
                  </div>
                ) : (
                  <p className="text-slate-500">Esta proposta não está mais disponível para avaliação.</p>
                )}
              </div>
            )}
            
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center">
          <p className="text-slate-500 text-xs">
            Aero Energia Solar • CNPJ 00.000.000/0001-00
          </p>
        </div>
      </div>
    </div>
  );
}
