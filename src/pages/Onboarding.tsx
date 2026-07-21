import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  Image as ImageIcon,
  Loader2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AnimatedNavbarLogo } from '../components/brand/AnimatedNavbarLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { LEGAL_DOCUMENTS, type LegalDocumentType } from '../lib/legal/legalCatalog';
import {
  firstUseService,
  MIN_FIRST_USE_LOGOS,
  type FirstUseStatus,
} from '../services/firstUseService';
import { legalService, type LegalStatus } from '../services/legalService';
import { profileService } from '../services/profileService';
import type { Profile } from '../types/profile';
import {
  extractActiveLogo,
  extractAllLogos,
  MAX_ACCOUNT_LOGOS,
  serializeLogos,
} from '../utils/logoHelper';

const EMPTY_LEGAL_STATUS: LegalStatus = { complete: false, documents: [] };
const EMPTY_STATUS: FirstUseStatus = {
  company_complete: false,
  responsible_complete: false,
  identity_complete: false,
  legal_complete: false,
  completed_steps: 0,
  total_steps: 4,
  complete: false,
};

const inputClassName = 'w-full rounded-xl border border-brand-border bg-brand-surface px-3 py-2.5 text-sm text-brand-dark outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15';

const STEPS = [
  { title: 'Boas-vindas', icon: Sparkles },
  { title: 'Empresa', icon: Building2 },
  { title: 'Responsável', icon: UserRound },
  { title: 'Identidade visual', icon: ImageIcon },
  { title: 'Segurança e termos', icon: ShieldCheck },
  { title: 'Concluir', icon: CheckCircle2 },
] as const;

export function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [legalStatus, setLegalStatus] = useState<LegalStatus>(EMPTY_LEGAL_STATUS);
  const [status, setStatus] = useState<FirstUseStatus>(EMPTY_STATUS);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isAcceptingLegal, setIsAcceptingLegal] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    phone: '',
    company_email: '',
    city: '',
    state: '',
  });
  const [responsibleForm, setResponsibleForm] = useState({
    seller_name: '',
    seller_phone: '',
    seller_email: '',
  });

  const mandatoryFirstUse = Boolean(user && firstUseService.requiresFirstUse(user));

  const refreshStatus = (nextProfile: Profile, nextLegalStatus = legalStatus) => {
    const nextStatus = firstUseService.buildStatus(nextProfile, nextLegalStatus);
    setStatus(nextStatus);
    return nextStatus;
  };

  const loadWizard = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setLoadError(null);
      const snapshot = await firstUseService.load(user);
      setProfile(snapshot.profile);
      setLegalStatus(snapshot.legalStatus);
      setStatus(snapshot.status);
      setCompanyForm({
        company_name: snapshot.profile.company_name || '',
        phone: snapshot.profile.phone || '',
        company_email: snapshot.profile.company_email || '',
        city: snapshot.profile.city || '',
        state: snapshot.profile.state || '',
      });
      setResponsibleForm({
        seller_name: snapshot.profile.seller_name || snapshot.profile.name || '',
        seller_phone: snapshot.profile.seller_phone || '',
        seller_email: snapshot.profile.seller_email || '',
      });
    } catch (error) {
      console.error('Erro ao carregar o primeiro uso:', error);
      setLoadError('Não foi possível carregar a configuração inicial da conta.');
      toast.error('Não foi possível carregar a configuração inicial da conta.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWizard();
  }, [user?.id]);

  const progress = Math.round((status.completed_steps / Math.max(status.total_steps, 1)) * 100);
  const logos = useMemo(() => extractAllLogos(profile?.logo_url || null), [profile?.logo_url]);
  const activeLogo = useMemo(() => extractActiveLogo(profile?.logo_url || null), [profile?.logo_url]);
  const logoCount = logos.length;
  const hasMinimumLogo = logoCount >= MIN_FIRST_USE_LOGOS;
  const logoLimitReached = logoCount >= MAX_ACCOUNT_LOGOS;

  const saveCompany = async () => {
    if (!user || !profile) return false;
    if (!companyForm.company_name.trim()) {
      toast.error('Informe o nome da empresa.');
      return false;
    }
    if (!companyForm.phone.trim() && !companyForm.company_email.trim()) {
      toast.error('Informe pelo menos um telefone ou e-mail comercial.');
      return false;
    }
    if (!companyForm.city.trim() || companyForm.state.trim().length !== 2) {
      toast.error('Informe a cidade e a UF com duas letras.');
      return false;
    }

    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile(user.id, {
        company_name: companyForm.company_name.trim(),
        phone: companyForm.phone.trim() || null,
        company_email: companyForm.company_email.trim() || null,
        city: companyForm.city.trim(),
        state: companyForm.state.trim().toUpperCase(),
      });
      setProfile(updated);
      refreshStatus(updated);
      window.dispatchEvent(new CustomEvent<Profile>('solamigo:profile-updated', { detail: updated }));
      toast.success('Dados da empresa salvos.');
      return true;
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
      toast.error('Não foi possível salvar os dados da empresa.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveResponsible = async () => {
    if (!user || !profile) return false;
    if (!responsibleForm.seller_name.trim()) {
      toast.error('Informe o nome do responsável.');
      return false;
    }
    if (!responsibleForm.seller_phone.trim() && !responsibleForm.seller_email.trim()) {
      toast.error('Informe pelo menos um telefone ou e-mail do responsável.');
      return false;
    }

    setIsSaving(true);
    try {
      const updated = await profileService.updateProfile(user.id, {
        seller_name: responsibleForm.seller_name.trim(),
        seller_phone: responsibleForm.seller_phone.trim() || null,
        seller_email: responsibleForm.seller_email.trim() || null,
      });
      setProfile(updated);
      refreshStatus(updated);
      window.dispatchEvent(new CustomEvent<Profile>('solamigo:profile-updated', { detail: updated }));
      toast.success('Responsável comercial salvo.');
      return true;
    } catch (error) {
      console.error('Erro ao salvar responsável:', error);
      toast.error('Não foi possível salvar os dados do responsável.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile || !event.target.files?.length) return;
    if (logoLimitReached) {
      toast.error(`O limite de ${MAX_ACCOUNT_LOGOS} logos já foi preenchido.`);
      event.target.value = '';
      return;
    }

    const file = event.target.files[0];
    setIsUploadingLogo(true);

    try {
      const url = await profileService.uploadLogo(file, user.id);
      const nextLogos = logos.includes(url) ? logos : [...logos, url];
      const principal = activeLogo || url;
      const serialized = serializeLogos(principal, nextLogos);
      const updated = await profileService.updateProfile(user.id, { logo_url: serialized });
      await firstUseService.setLogoSkipped(false);
      setProfile(updated);
      refreshStatus(updated);
      window.dispatchEvent(new CustomEvent<Profile>('solamigo:profile-updated', { detail: updated }));
      toast.success(`Logo ${nextLogos.length} de ${MAX_ACCOUNT_LOGOS} adicionada.`);
    } catch (error) {
      console.error('Erro ao enviar logo:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível enviar a logo.');
    } finally {
      setIsUploadingLogo(false);
      event.target.value = '';
    }
  };

  const setPrimaryLogo = async (logoUrl: string) => {
    if (!user || !profile || activeLogo === logoUrl) return;

    try {
      setIsSaving(true);
      const updated = await profileService.updateProfile(user.id, {
        logo_url: serializeLogos(logoUrl, logos),
      });
      setProfile(updated);
      refreshStatus(updated);
      window.dispatchEvent(new CustomEvent<Profile>('solamigo:profile-updated', { detail: updated }));
      toast.success('Logo principal definida.');
    } catch (error) {
      console.error('Erro ao definir logo principal:', error);
      toast.error('Não foi possível definir a logo principal.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeLogo = async (logoUrl: string) => {
    if (!user || !profile) return;

    try {
      setIsSaving(true);
      const nextLogos = logos.filter((logo) => logo !== logoUrl);
      const nextActive = activeLogo === logoUrl ? nextLogos[0] || null : activeLogo;
      const updated = await profileService.updateProfile(user.id, {
        logo_url: nextLogos.length ? serializeLogos(nextActive, nextLogos) : null,
      });
      setProfile(updated);
      refreshStatus(updated);
      window.dispatchEvent(new CustomEvent<Profile>('solamigo:profile-updated', { detail: updated }));
      toast.success('Logo removida do cadastro.');
    } catch (error) {
      console.error('Erro ao remover logo:', error);
      toast.error('Não foi possível remover a logo.');
    } finally {
      setIsSaving(false);
    }
  };

  const acceptLegalDocuments = async () => {
    if (!profile) return;
    try {
      setIsAcceptingLegal(true);
      await legalService.acceptCurrentDocuments();
      const nextLegalStatus = await legalService.getMyStatus();
      setLegalStatus(nextLegalStatus);
      refreshStatus(profile, nextLegalStatus);
      toast.success('Aceite das versões atuais registrado.');
    } catch (error) {
      console.error('Erro ao registrar aceite:', error);
      toast.error('Não foi possível registrar o aceite dos documentos.');
    } finally {
      setIsAcceptingLegal(false);
    }
  };

  const goNext = async () => {
    if (currentStep === 0) {
      setCurrentStep(1);
      return;
    }
    if (currentStep === 1) {
      if (await saveCompany()) setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (await saveResponsible()) setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (!hasMinimumLogo) {
        toast.error('Envie pelo menos uma logo para continuar.');
        return;
      }
      setCurrentStep(4);
      return;
    }
    if (currentStep === 4) {
      if (!legalStatus.complete) {
        toast.error('Aceite as versões atuais dos documentos para continuar.');
        return;
      }
      setCurrentStep(5);
    }
  };

  const finishWizard = async () => {
    if (!profile) return;
    const finalStatus = refreshStatus(profile, legalStatus);
    if (!finalStatus.complete) {
      toast.error('Ainda existem etapas obrigatórias pendentes.');
      const firstPending = [
        finalStatus.company_complete,
        finalStatus.responsible_complete,
        finalStatus.identity_complete,
        finalStatus.legal_complete,
      ].findIndex((complete) => !complete);
      setCurrentStep(firstPending + 1);
      return;
    }

    try {
      setIsSaving(true);
      await firstUseService.complete(finalStatus);
      toast.success('Configuração inicial concluída. Bem-vindo ao SolAmigo!');
      window.location.assign('/dashboard');
    } catch (error) {
      console.error('Erro ao concluir primeiro uso:', error);
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a configuração inicial.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`${mandatoryFirstUse ? 'fixed inset-0 z-50' : ''} grid min-h-[60vh] place-items-center bg-brand-gray`}>
        <div className="flex items-center gap-3 text-brand-blue">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="font-semibold">Preparando sua configuração inicial...</span>
        </div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className={`${mandatoryFirstUse ? 'fixed inset-0 z-50' : ''} grid min-h-[60vh] place-items-center bg-brand-gray p-6`}>
        <Card className="w-full max-w-lg p-6 text-center">
          <h1 className="text-xl font-bold text-brand-dark">Não foi possível preparar o primeiro uso</h1>
          <p className="mt-2 text-sm text-slate-500">{loadError || 'Os dados da conta não foram encontrados.'}</p>
          <Button type="button" className="mt-5" onClick={() => void loadWizard()}>Tentar novamente</Button>
        </Card>
      </div>
    );
  }

  const StepIcon = STEPS[currentStep].icon;

  return (
    <div className={`${mandatoryFirstUse ? 'fixed inset-0 z-50 overflow-y-auto bg-brand-gray' : ''}`}>
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AnimatedNavbarLogo className="h-12 w-12" />
            <div>
              <p className="text-sm font-bold text-brand-dark">SolAmigo</p>
              <p className="text-xs text-slate-500">Configuração inicial da conta</p>
            </div>
          </div>
          {!mandatoryFirstUse && (
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          )}
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-brand-border bg-brand-surface p-5 shadow-sm">
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-brand-dark">Progresso essencial</span>
                <span className="text-brand-blue">{progress}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-brand-gray">
                <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">{status.completed_steps} de {status.total_steps} configurações concluídas</p>
            </div>

            <nav className="space-y-2" aria-label="Etapas do primeiro uso">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const active = currentStep === index;
                const completed = index > 0 && index < 5
                  ? [status.company_complete, status.responsible_complete, status.identity_complete, status.legal_complete][index - 1]
                  : index === 5 && status.complete;
                return (
                  <button
                    key={step.title}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                      active
                        ? 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue'
                        : 'border-transparent text-slate-500 hover:bg-brand-gray'
                    }`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${completed ? 'bg-emerald-100 text-emerald-600' : active ? 'bg-brand-blue text-white' : 'bg-brand-gray text-slate-500'}`}>
                      {completed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="font-semibold">{step.title}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex min-h-[620px] flex-col overflow-hidden rounded-3xl border border-brand-border bg-brand-surface shadow-sm">
            <div className="border-b border-brand-border bg-gradient-to-r from-brand-blue/10 via-brand-surface to-brand-yellow/10 px-6 py-6 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-blue text-white">
                  <StepIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">Etapa {currentStep + 1} de {STEPS.length}</p>
                  <h1 className="text-2xl font-bold text-brand-dark">{STEPS[currentStep].title}</h1>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 sm:p-8">
              {currentStep === 0 && (
                <div className="mx-auto max-w-2xl py-8 text-center">
                  <Sparkles className="mx-auto h-12 w-12 text-brand-yellow" />
                  <h2 className="mt-5 text-3xl font-bold text-brand-dark">Vamos preparar sua operação</h2>
                  <p className="mt-4 text-base leading-7 text-slate-500">
                    Os dados preenchidos aqui serão salvos diretamente nas áreas reais do SolAmigo e continuarão disponíveis para consulta e edição dentro da plataforma.
                  </p>
                  <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
                    {[
                      'Identificação da empresa',
                      'Responsável comercial',
                      'De 1 a 3 logos da marca',
                      'Segurança e documentos legais',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-gray/50 p-4 text-sm font-semibold text-brand-dark">
                        <CheckCircle2 className="h-5 w-5 text-brand-blue" /> {item}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="mx-auto max-w-2xl space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-brand-dark">Dados da empresa</h2>
                    <p className="mt-1 text-sm text-slate-500">Essas informações aparecerão em Configurações da Conta e serão reutilizadas nas áreas comerciais.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2 sm:col-span-2">
                      <span className="text-sm font-semibold text-brand-dark">Nome da empresa *</span>
                      <input value={companyForm.company_name} onChange={(event) => setCompanyForm((current) => ({ ...current, company_name: event.target.value }))} className={inputClassName} placeholder="Ex.: Sol Amigo Energia" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-brand-dark">Telefone / WhatsApp</span>
                      <input value={companyForm.phone} onChange={(event) => setCompanyForm((current) => ({ ...current, phone: event.target.value }))} className={inputClassName} placeholder="(00) 00000-0000" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-brand-dark">E-mail comercial</span>
                      <input type="email" value={companyForm.company_email} onChange={(event) => setCompanyForm((current) => ({ ...current, company_email: event.target.value }))} className={inputClassName} placeholder="contato@empresa.com.br" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-brand-dark">Cidade *</span>
                      <input value={companyForm.city} onChange={(event) => setCompanyForm((current) => ({ ...current, city: event.target.value }))} className={inputClassName} />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-brand-dark">UF *</span>
                      <input maxLength={2} value={companyForm.state} onChange={(event) => setCompanyForm((current) => ({ ...current, state: event.target.value.toUpperCase() }))} className={`${inputClassName} uppercase`} placeholder="SP" />
                    </label>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="mx-auto max-w-2xl space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-brand-dark">Responsável comercial</h2>
                    <p className="mt-1 text-sm text-slate-500">Os dados serão salvos em Configurações da Conta → Dados do Usuário.</p>
                  </div>
                  <div className="space-y-4">
                    <label className="block space-y-2">
                      <span className="text-sm font-semibold text-brand-dark">Nome do responsável *</span>
                      <input value={responsibleForm.seller_name} onChange={(event) => setResponsibleForm((current) => ({ ...current, seller_name: event.target.value }))} className={inputClassName} placeholder="Nome que será apresentado aos clientes" />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-brand-dark">Telefone / WhatsApp</span>
                        <input value={responsibleForm.seller_phone} onChange={(event) => setResponsibleForm((current) => ({ ...current, seller_phone: event.target.value }))} className={inputClassName} />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-brand-dark">E-mail</span>
                        <input type="email" value={responsibleForm.seller_email} onChange={(event) => setResponsibleForm((current) => ({ ...current, seller_email: event.target.value }))} className={inputClassName} />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-brand-dark">Adicione as logos da empresa</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Envie <strong className="text-brand-dark">pelo menos 1 logo</strong> para continuar. A conta permite no máximo <strong className="text-brand-dark">3 logos</strong>, que ficarão disponíveis em Configurações da Conta → Logo e no sistema de capas.
                    </p>
                  </div>

                  <div className={`rounded-2xl border p-4 ${hasMinimumLogo ? 'border-emerald-200 bg-emerald-50' : 'border-brand-blue/20 bg-brand-blue/5'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className={`font-bold ${hasMinimumLogo ? 'text-emerald-700' : 'text-brand-dark'}`}>
                          {hasMinimumLogo ? `${logoCount} logo(s) cadastrada(s)` : 'Envie a primeira logo para continuar'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {logoLimitReached
                            ? 'O limite da conta foi preenchido. Escolha abaixo qual será a logo principal.'
                            : hasMinimumLogo
                              ? `A etapa já está liberada. Você ainda pode adicionar mais ${MAX_ACCOUNT_LOGOS - logoCount}.`
                              : `Mínimo obrigatório: ${MIN_FIRST_USE_LOGOS}. Máximo permitido: ${MAX_ACCOUNT_LOGOS}.`}
                        </p>
                      </div>
                      <span className="rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-bold text-brand-blue">
                        {logoCount} de {MAX_ACCOUNT_LOGOS}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {Array.from({ length: MAX_ACCOUNT_LOGOS }, (_, index) => {
                      const logo = logos[index];
                      const isPrimary = Boolean(logo && logo === activeLogo);
                      const requiredSlot = index < MIN_FIRST_USE_LOGOS;
                      return (
                        <Card key={logo || `empty-logo-${index}`} className={`overflow-hidden border-2 ${isPrimary ? 'border-brand-blue' : logo ? 'border-brand-border' : 'border-dashed border-brand-border'}`}>
                          <div className="flex min-h-44 items-center justify-center bg-white p-5">
                            {logo ? (
                              <img src={logo} alt={`Logo ${index + 1}`} className="max-h-28 max-w-full object-contain" />
                            ) : (
                              <div className="text-center">
                                <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
                                <p className="mt-3 text-sm font-bold text-brand-dark">Logo {index + 1}</p>
                                <p className="mt-1 text-xs text-slate-400">{requiredSlot ? 'Obrigatória' : 'Opcional'}</p>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-brand-border p-3">
                            {logo ? (
                              <div className="space-y-2">
                                {isPrimary ? (
                                  <div className="flex items-center justify-center gap-2 rounded-lg bg-brand-blue/10 px-3 py-2 text-xs font-bold text-brand-blue">
                                    <Star className="h-3.5 w-3.5 fill-current" /> Logo principal
                                  </div>
                                ) : (
                                  <Button type="button" variant="outline" className="w-full gap-2" disabled={isSaving || isUploadingLogo} onClick={() => void setPrimaryLogo(logo)}>
                                    <Star className="h-4 w-4" /> Definir como principal
                                  </Button>
                                )}
                                <Button type="button" variant="outline" className="w-full gap-2 text-red-600 hover:text-red-700" disabled={isSaving || isUploadingLogo} onClick={() => void removeLogo(logo)}>
                                  <Trash2 className="h-4 w-4" /> Remover
                                </Button>
                              </div>
                            ) : (
                              <p className="py-2 text-center text-xs font-semibold text-slate-400">{requiredSlot ? 'Mínimo necessário' : 'Espaço opcional'}</p>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  <input id="first-use-logo" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo || logoLimitReached} />
                  <div className="flex flex-col items-center gap-3">
                    <Button type="button" className="gap-2" disabled={isUploadingLogo || isSaving || logoLimitReached} onClick={() => document.getElementById('first-use-logo')?.click()}>
                      {isUploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isUploadingLogo
                        ? 'Enviando...'
                        : logoLimitReached
                          ? 'Limite de 3 logos preenchido'
                          : `Enviar logo ${logoCount + 1} de ${MAX_ACCOUNT_LOGOS}`}
                    </Button>
                    <p className="text-center text-xs text-slate-500">Formatos PNG, JPG ou WebP. Após o primeiro upload, você já poderá continuar.</p>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-brand-dark">Segurança e documentos legais</h2>
                    <p className="mt-1 text-sm text-slate-500">Revise os documentos atuais. A autenticação em dois fatores continuará disponível como recomendação em Configurações da Conta → Segurança.</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {(Object.keys(LEGAL_DOCUMENTS) as LegalDocumentType[]).map((type) => {
                      const document = LEGAL_DOCUMENTS[type];
                      const accepted = legalStatus.documents.find((item) => item.document_type === type)?.accepted;
                      return (
                        <Link key={type} to={document.route} target="_blank" className="rounded-2xl border border-brand-border bg-brand-gray/50 p-4 transition hover:border-brand-blue/50">
                          <div className="flex items-start justify-between gap-3">
                            <FileCheck2 className="h-5 w-5 text-brand-blue" />
                            {accepted ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldCheck className="h-5 w-5 text-amber-500" />}
                          </div>
                          <p className="mt-4 font-bold text-brand-dark">{document.title}</p>
                          <p className="mt-1 text-xs text-slate-500">Versão {document.version}</p>
                        </Link>
                      );
                    })}
                  </div>

                  <div className={`rounded-2xl border p-5 ${legalStatus.complete ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                    <p className={`font-bold ${legalStatus.complete ? 'text-emerald-700' : 'text-amber-800'}`}>
                      {legalStatus.complete ? 'Versões atuais aceitas' : 'Aceite necessário para continuar'}
                    </p>
                    <p className={`mt-1 text-sm ${legalStatus.complete ? 'text-emerald-600' : 'text-amber-700'}`}>
                      O aceite é registrado por documento e versão. Senhas, tokens e dados de cartão não fazem parte desse registro.
                    </p>
                    {!legalStatus.complete && (
                      <Button type="button" className="mt-4" disabled={isAcceptingLegal} onClick={() => void acceptLegalDocuments()}>
                        {isAcceptingLegal ? 'Registrando...' : 'Aceitar versões atuais'}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div className="text-center">
                    <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
                    <h2 className="mt-4 text-3xl font-bold text-brand-dark">Sua conta está pronta</h2>
                    <p className="mt-3 text-sm leading-6 text-slate-500">Confira o resumo. Ao concluir, você terá acesso à plataforma e poderá editar todos esses dados nas respectivas áreas.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Empresa', complete: status.company_complete, detail: companyForm.company_name },
                      { label: 'Responsável', complete: status.responsible_complete, detail: responsibleForm.seller_name },
                      { label: 'Identidade visual', complete: status.identity_complete, detail: `${logoCount} de ${MAX_ACCOUNT_LOGOS} logos configuradas` },
                      { label: 'Documentos legais', complete: status.legal_complete, detail: legalStatus.complete ? 'Versões atuais aceitas' : 'Aceite pendente' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-brand-border bg-brand-gray/50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-brand-dark">{item.label}</p>
                          {item.complete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldCheck className="h-5 w-5 text-amber-500" />}
                        </div>
                        <p className="mt-2 text-sm text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-5 text-sm leading-6 text-slate-600">
                    As logos adicionais continuam opcionais e podem ser incluídas depois em Configurações da Conta → Logo, respeitando o limite de três.
                  </div>
                </div>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-brand-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <Button type="button" variant="outline" disabled={currentStep === 0 || isSaving || isUploadingLogo || isAcceptingLegal} onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Button>

              {currentStep < 5 ? (
                <Button type="button" disabled={isSaving || isUploadingLogo || isAcceptingLegal || (currentStep === 3 && !hasMinimumLogo)} onClick={() => void goNext()} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {currentStep === 0 ? 'Começar configuração' : currentStep === 3 ? 'Salvar e continuar' : 'Salvar e continuar'} <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" disabled={isSaving || !status.complete} onClick={() => void finishWizard()} className="gap-2">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Entrar na plataforma
                </Button>
              )}
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
