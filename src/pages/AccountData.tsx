import { FormEvent, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileCheck2, Loader2, Shield, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { LEGAL_DOCUMENTS, LegalDocumentType } from '../lib/legal/legalCatalog';
import { supabase } from '../lib/supabase/client';
import { accountDataService } from '../services/accountDataService';
import { legalService, LegalStatus } from '../services/legalService';

const EMPTY_STATUS: LegalStatus = { complete: false, documents: [] };

interface AccountDataProps {
  embedded?: boolean;
}

export function AccountData({ embedded = false }: AccountDataProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [legalStatus, setLegalStatus] = useState<LegalStatus>(EMPTY_STATUS);
  const [isLoadingLegal, setIsLoadingLegal] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const loadLegalStatus = async () => {
    try {
      setIsLoadingLegal(true);
      setLegalStatus(await legalService.getMyStatus());
    } catch (error) {
      console.error('Erro ao carregar aceites legais:', error);
      toast.error('Não foi possível carregar o histórico de aceites.');
    } finally {
      setIsLoadingLegal(false);
    }
  };

  useEffect(() => {
    void loadLegalStatus();
  }, []);

  const handleAcceptLegal = async () => {
    try {
      setIsAccepting(true);
      await legalService.acceptCurrentDocuments();
      await loadLegalStatus();
      toast.success('Aceite das versões atuais registrado.');
    } catch (error) {
      console.error('Erro ao aceitar documentos:', error);
      toast.error('Não foi possível registrar o aceite.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await accountDataService.exportAccountData();
      toast.success('Exportação gerada. Links privados do arquivo expiram em uma hora.');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível exportar seus dados.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.email) return;
    if (confirmation.trim().toLowerCase() !== 'excluir a conta') {
      toast.error('Digite exatamente “excluir a conta”.');
      return;
    }
    if (!password) {
      toast.error('Informe sua senha atual.');
      return;
    }

    try {
      setIsDeleting(true);
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (signInError) throw new Error('A senha digitada está incorreta.');

      const accessToken = signInData.session?.access_token;
      if (!accessToken) {
        throw new Error('Não foi possível gerar uma confirmação recente da senha. Entre novamente e repita a exclusão.');
      }

      await accountDataService.deleteAccount(accessToken);
      toast.success('Conta, dados e arquivos excluídos.');
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a conta.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section
      id="privacidade-dados"
      aria-label="Privacidade e dados da conta"
      className={`${embedded ? 'mt-6' : ''} mx-auto flex w-full max-w-5xl flex-col gap-6`}
    >
      {!embedded && (
        <header>
          <div className="flex items-center gap-2 text-brand-blue">
            <Shield className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.18em]">Privacidade e dados</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-brand-dark">Controle dos dados da sua conta</h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">Consulte versões legais, exporte uma cópia estruturada e solicite exclusão completa dos dados e arquivos gerenciados.</p>
        </header>
      )}

      {embedded && (
        <div className="border-t border-brand-border pt-6">
          <div className="flex items-center gap-2 text-brand-blue">
            <Shield className="h-5 w-5" />
            <h2 className="text-lg font-bold text-brand-dark">Privacidade e dados</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Documentos legais e exportação de dados fazem parte das configurações de segurança. A exclusão definitiva fica em Encerramento da Conta.</p>
        </div>
      )}

      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-brand-blue" />
              <h2 className="text-lg font-bold text-brand-dark">Documentos legais e aceites</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">O aceite é registrado por tipo e versão. Nenhum IP, cookie, senha ou token é armazenado nessa comprovação.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${legalStatus.complete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {isLoadingLegal ? 'Carregando...' : legalStatus.complete ? 'Versões atuais aceitas' : 'Aceite pendente'}
          </span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {(Object.keys(LEGAL_DOCUMENTS) as LegalDocumentType[]).map((type) => {
            const document = LEGAL_DOCUMENTS[type];
            const status = legalStatus.documents.find((item) => item.document_type === type);
            return (
              <Link key={type} to={document.route} target="_blank" className="rounded-xl border border-brand-border bg-brand-gray/60 p-4 transition hover:border-brand-blue/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-dark">{document.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Versão {document.version}</p>
                  </div>
                  {status?.accepted ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                </div>
                <p className="mt-3 text-xs font-semibold text-amber-700">Minuta — revisão jurídica pendente</p>
              </Link>
            );
          })}
        </div>

        {!legalStatus.complete && (
          <div className="mt-5 flex justify-end">
            <Button onClick={() => void handleAcceptLegal()} disabled={isAccepting}>
              {isAccepting ? 'Registrando...' : 'Aceitar versões atuais'}
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-brand-blue" />
              <h2 className="text-lg font-bold text-brand-dark">Exportar dados</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Gera um JSON com cadastro, clientes, kits, propostas, cálculos, eventos, assinatura, uso e inventário dos arquivos. Senhas, chaves, TOTP, tokens e dados de cartão nunca entram na exportação.</p>
          </div>
          <Button onClick={() => void handleExport()} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? 'Gerando...' : 'Baixar exportação'}
          </Button>
        </div>
      </Card>

      {!embedded && (
        <Card className="overflow-hidden border-red-200">
          <div className="border-b border-red-200 bg-red-50 px-6 py-5">
            <div className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              <h2 className="text-lg font-bold">Excluir conta e dados</h2>
            </div>
            <p className="mt-2 text-sm text-red-600">A função remove primeiro os arquivos das pastas da conta e somente depois exclui o usuário e os registros relacionados.</p>
          </div>
          <form onSubmit={handleDelete} className="space-y-4 p-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              Gere a exportação antes de continuar. Logs estritamente necessários para segurança, prevenção de fraude ou obrigação legal podem ser preservados de forma desvinculada conforme a política de retenção aprovada.
            </div>
            <div>
              <label className="text-sm font-medium text-brand-dark">Digite <strong className="text-red-600">excluir a conta</strong></label>
              <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium text-brand-dark">Senha atual</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="destructive" disabled={isDeleting} className="gap-2 bg-red-600 text-white hover:bg-red-700">
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeleting ? 'Excluindo...' : 'Excluir permanentemente'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}
