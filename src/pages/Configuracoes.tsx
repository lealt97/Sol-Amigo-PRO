import React, { useEffect, useMemo, useState } from "react";
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { Profile } from '../types/profile';
import { DatabaseSetupAlert } from '../components/ui/DatabaseSetupAlert';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MfaSettingsCard } from '../components/auth/MfaSettingsCard';
import {
  Building2,
  Image as ImageIcon,
  User,
  Settings as SettingsIcon,
  Shield,
  Upload,
  Save,
  Loader2,
  Lock,
  UserX,
  AlertTriangle,
  Check,
  Trash2,
  PenLine,
  Palette,
  RotateCcw,
  Sparkles,
  Camera,
} from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { extractActiveLogo, extractAllLogos, serializeLogos } from '../utils/logoHelper';
import {
  applyPlatformTheme,
  buildPlatformTheme,
  DEFAULT_PLATFORM_THEME_SEED,
  PLATFORM_THEME_PRESETS,
  PlatformThemeSeed,
  resetPlatformTheme,
} from '../lib/theme/platformTheme';

type SettingsTab = 'empresa' | 'logo' | 'vendedor' | 'customizacao' | 'preferencias' | 'seguranca' | 'encerramento';

const inputClassName = "w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-dark focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none";
const colorInputClassName = "h-11 w-full cursor-pointer rounded-lg border border-brand-border bg-brand-surface p-1";

export function Configuracoes() {
  const { user, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('empresa');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const validTabs: SettingsTab[] = ['logo', 'empresa', 'vendedor', 'customizacao', 'preferencias', 'seguranca', 'encerramento'];
    if (validTabs.includes(tabParam as SettingsTab)) {
      setActiveTab(tabParam as SettingsTab);
    }
  }, [tabParam]);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const data = await profileService.getProfile(user.id);
        setProfile(data);
        applyPlatformTheme(data.platform_theme || null);
      } catch (err) {
        console.error('Error loading profile:', err);
        setLoadError(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const activeTheme = useMemo(() => {
    return profile?.platform_theme || buildPlatformTheme(DEFAULT_PLATFORM_THEME_SEED);
  }, [profile?.platform_theme]);

  const themeSeed = activeTheme.seed;
  const themePalette = activeTheme.palette;

  const notifyProfileUpdated = (nextProfile: Profile) => {
    window.dispatchEvent(new CustomEvent<Profile>('solamigo:profile-updated', { detail: nextProfile }));
  };

  const setProfileAndPreview = (nextProfile: Profile) => {
    setProfile(nextProfile);
    applyPlatformTheme(nextProfile.platform_theme || null);
  };

  const updateThemeSeed = (field: keyof PlatformThemeSeed, value: string) => {
    if (!profile) return;
    const nextSeed = {
      ...themeSeed,
      [field]: field === 'mode' ? value as PlatformThemeSeed['mode'] : value,
    };
    const nextTheme = buildPlatformTheme(nextSeed);
    setProfileAndPreview({ ...profile, platform_theme: nextTheme });
  };

  const applyPreset = (seed: PlatformThemeSeed) => {
    if (!profile) return;
    const nextTheme = buildPlatformTheme(seed);
    setProfileAndPreview({ ...profile, platform_theme: nextTheme });
    toast.success('Prévia de paleta aplicada. Salve para tornar permanente.');
  };

  const handleResetTheme = () => {
    if (!profile) return;
    const nextTheme = resetPlatformTheme();
    setProfile({ ...profile, platform_theme: nextTheme });
    toast('Paleta padrão restaurada em prévia. Salve para tornar permanente.');
  };

  const handleSaveTheme = async () => {
    if (!user || !profile) return;

    setIsSavingTheme(true);
    try {
      const theme = profile.platform_theme || buildPlatformTheme(DEFAULT_PLATFORM_THEME_SEED);
      const data = await profileService.updateProfile(user.id, { platform_theme: theme });
      setProfile(data);
      applyPlatformTheme(data.platform_theme || null);
      toast.success('Paleta da plataforma salva com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar paleta da plataforma');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      const { id, created_at, updated_at, ...updateData } = profile;
      const data = await profileService.updateProfile(user.id, updateData);
      setProfile(data);
      applyPlatformTheme(data.platform_theme || null);
      notifyProfileUpdated(data);
      toast.success('Configurações salvas com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile || !event.target.files?.length) return;

    const file = event.target.files[0];
    const previousAvatarUrl = profile.avatar_url;
    let uploadedPath: string | null = null;
    setUploadingAvatar(true);

    try {
      const uploaded = await profileService.uploadProfileAvatar(file, user.id);
      uploadedPath = uploaded.path;
      const data = await profileService.updateProfile(user.id, { avatar_url: uploaded.url });
      setProfile(data);
      notifyProfileUpdated(data);

      if (previousAvatarUrl) {
        void profileService.deleteProfileAvatar(previousAvatarUrl, user.id).catch((error) => {
          console.warn('Não foi possível remover a foto de perfil anterior:', error);
        });
      }

      toast.success('Foto de perfil atualizada!');
    } catch (err: any) {
      if (uploadedPath) {
        void profileService.deleteProfileAvatar(uploadedPath, user.id).catch(() => undefined);
      }
      toast.error(err.message || 'Erro ao enviar a foto de perfil');
    } finally {
      setUploadingAvatar(false);
      event.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    const previousAvatarUrl = profile.avatar_url;
    setRemovingAvatar(true);
    try {
      const data = await profileService.updateProfile(user.id, { avatar_url: null });
      setProfile(data);
      notifyProfileUpdated(data);
      await profileService.deleteProfileAvatar(previousAvatarUrl, user.id);
      toast.success('Foto de perfil removida.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover a foto de perfil');
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setUploadingLogo(true);

    try {
      const url = await profileService.uploadLogo(file, user.id);
      const currentLogos = extractAllLogos(profile.logo_url);
      const activeLogo = extractActiveLogo(profile.logo_url);
      const updatedLogos = [...currentLogos, url];
      const newActiveLogo = activeLogo || url;
      const serializedValue = serializeLogos(newActiveLogo, updatedLogos);

      const nextProfile = { ...profile, logo_url: serializedValue };
      setProfile(nextProfile);
      await profileService.updateProfile(user.id, { logo_url: serializedValue });
      toast.success('Logo enviada com sucesso!');
    } catch (err: any) {
      toast.error(err?.message?.includes('row-level security') ? 'Erro de permissão. Execute o supabase-schema.sql no SQL Editor.' : (err.message || 'Erro ao fazer upload da logo'));
    } finally {
      setUploadingLogo(false);
      event.target.value = '';
    }
  };

  const handleSetLogoActive = async (url: string) => {
    if (!user || !profile) return;

    try {
      const currentLogos = extractAllLogos(profile.logo_url);
      const serializedValue = serializeLogos(url, currentLogos);

      setProfile({ ...profile, logo_url: serializedValue });
      await profileService.updateProfile(user.id, { logo_url: serializedValue });
      toast.success('Logo ativa alterada com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar logo ativa');
    }
  };

  const handleDeleteLogo = async (url: string) => {
    if (!user || !profile) return;

    try {
      const currentLogos = extractAllLogos(profile.logo_url);
      const activeLogo = extractActiveLogo(profile.logo_url);
      const updatedLogos = currentLogos.filter((logo) => logo !== url);
      let newActiveLogo = activeLogo;

      if (activeLogo === url) {
        newActiveLogo = updatedLogos.length > 0 ? updatedLogos[0] : null;
      }

      const serializedValue = updatedLogos.length > 0 ? serializeLogos(newActiveLogo, updatedLogos) : null;

      setProfile({ ...profile, logo_url: serializedValue });
      await profileService.updateProfile(user.id, { logo_url: serializedValue });
      toast.success('Logo excluída com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir logo');
    }
  };

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    setUploadingSignature(true);

    try {
      const url = await profileService.uploadSellerSignature(file, user.id);
      const nextProfile = { ...profile, seller_signature_url: url };
      setProfile(nextProfile);
      await profileService.updateProfile(user.id, { seller_signature_url: url });
      toast.success('Assinatura enviada com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar assinatura');
    } finally {
      setUploadingSignature(false);
      event.target.value = '';
    }
  };

  const handleRemoveSignature = async () => {
    if (!user || !profile) return;

    try {
      const nextProfile = { ...profile, seller_signature_url: null };
      setProfile(nextProfile);
      await profileService.updateProfile(user.id, { seller_signature_url: null });
      toast.success('Assinatura removida.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover assinatura');
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = event.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile) return;
    const { name, value } = event.target;
    setProfile({ ...profile, [name]: value ? Number(value) : null });
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordErrorMessage(null);
    setPasswordSuccessMessage(null);

    if (!user?.email) {
      setPasswordErrorMessage('Usuário não autenticado.');
      return;
    }

    if (!currentPassword) {
      setPasswordErrorMessage('Por favor, insira sua senha atual.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMessage('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('A confirmação de senha não coincide com a nova senha.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) throw new Error('A senha atual digitada está incorreta.');

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      setPasswordSuccessMessage('Senha alterada com sucesso de forma instantânea!');
      toast.success('Senha atualizada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordErrorMessage(err.message || 'Ocorreu um erro ao tentar alterar a senha.');
      toast.error(err.message || 'Erro ao alterar a senha');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleteErrorMessage(null);
    setDeleteSuccessMessage(null);

    if (!user?.email) {
      setDeleteErrorMessage('Usuário não autenticado.');
      return;
    }

    if (deleteConfirmText.trim().toLowerCase() !== 'excluir a conta') {
      setDeleteErrorMessage('Por favor, digite exatamente "excluir a conta" para confirmar.');
      return;
    }

    if (!deletePassword) {
      setDeleteErrorMessage('Por favor, insira sua senha atual.');
      return;
    }

    setIsDeletingAccount(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: deletePassword });
      if (signInError) throw new Error('A senha digitada está incorreta.');

      const { error: deleteError } = await supabase.rpc('delete_user_account');
      if (deleteError) throw deleteError;

      setDeleteSuccessMessage('Sua conta e todos os dados foram excluídos permanentemente. Você será desconectado em instantes...');
      toast.success('Conta excluída com sucesso!');
      setTimeout(async () => { await signOut(); }, 3000);
    } catch (err: any) {
      setDeleteErrorMessage(err.message || 'Ocorreu um erro ao processar o encerramento da conta.');
      toast.error(err.message || 'Erro ao processar encerramento');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return <div className="text-brand-blue animate-pulse">Carregando configurações...</div>;
  }

  if (loadError) {
    return <DatabaseSetupAlert error={loadError} resourceName="suas configurações" />;
  }

  if (!profile) {
    return <div className="text-red-600">Carregando dados...</div>;
  }

  const tabs = [
    { id: 'empresa', label: 'Dados da Empresa', icon: Building2 },
    { id: 'logo', label: 'Logo', icon: ImageIcon },
    { id: 'vendedor', label: 'Dados do Usuário', icon: User },
    { id: 'customizacao', label: 'Customização da Conta', icon: Palette },
    { id: 'preferencias', label: 'Preferências Comerciais', icon: SettingsIcon },
    { id: 'seguranca', label: 'Segurança', icon: Shield },
    { id: 'encerramento', label: 'Encerramento da Conta', icon: UserX },
  ] as const;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark mb-2">Configurações da Conta</h1>
        <p className="text-sm text-slate-500">Personalize as informações, a marca e a aparência da sua plataforma.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-full md:w-64 flex flex-col gap-1 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                    : 'text-slate-500 hover:bg-gray-100 hover:text-brand-dark border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 w-full min-w-0">
          {activeTab === 'empresa' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados da Empresa</CardTitle>
                <CardDescription>Informações principais da sua empresa de energia solar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Razão Social / Nome da Empresa</label>
                    <input name="company_name" value={profile.company_name || ''} onChange={handleChange} className={inputClassName} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">CNPJ</label>
                    <input name="document" value={profile.document || ''} onChange={handleChange} className={inputClassName} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Telefone da Empresa</label>
                    <input name="phone" value={profile.phone || ''} onChange={handleChange} className={inputClassName} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">E-mail da Empresa</label>
                    <input name="company_email" type="email" value={profile.company_email || ''} onChange={handleChange} className={inputClassName} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-brand-dark">Website</label>
                    <input name="website" placeholder="https://" value={profile.website || ''} onChange={handleChange} className={inputClassName} />
                  </div>
                </div>

                <div className="pt-4 border-t border-brand-border">
                  <h4 className="text-sm font-medium text-brand-dark mb-4">Endereço</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-brand-dark">CEP</label>
                      <input name="cep" value={profile.cep || ''} onChange={handleChange} className={inputClassName} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium text-brand-dark">Endereço</label>
                      <input name="address" value={profile.address || ''} onChange={handleChange} className={inputClassName} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-brand-dark">Cidade</label>
                      <input name="city" value={profile.city || ''} onChange={handleChange} className={inputClassName} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-brand-dark">Estado (UF)</label>
                      <input name="state" maxLength={2} value={profile.state || ''} onChange={handleChange} className={`${inputClassName} uppercase`} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'logo' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logos da Empresa</CardTitle>
                <CardDescription>Envie múltiplos logotipos e defina qual será o principal para cabeçalhos de propostas em PDF e links públicos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {extractAllLogos(profile.logo_url).map((logoUrl, index) => {
                    const isActive = extractActiveLogo(profile.logo_url) === logoUrl;
                    return (
                      <div key={logoUrl} className={`relative group rounded-lg border p-4 bg-brand-surface flex flex-col items-center justify-center transition-all ${isActive ? 'border-brand-blue ring-2 ring-brand-blue/20 bg-brand-blue/5' : 'border-brand-border hover:border-slate-400'}`}>
                        {isActive && (
                          <div className="absolute top-2 left-2 flex items-center gap-1 bg-brand-blue text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            <Check className="w-3 h-3" /> Padrão
                          </div>
                        )}
                        <div className="h-20 w-full flex items-center justify-center p-2 mb-3">
                          <img src={logoUrl} alt={`Logo ${index + 1}`} className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="flex gap-2 w-full mt-auto pt-2 border-t border-brand-border/60">
                          {!isActive ? (
                            <button onClick={() => handleSetLogoActive(logoUrl)} className="flex-1 text-xs text-brand-blue hover:text-brand-blue-hover font-medium py-1.5 px-2 bg-brand-blue/10 hover:bg-brand-blue/20 rounded transition-colors text-center cursor-pointer">
                              Tornar Padrão
                            </button>
                          ) : (
                            <span className="flex-1 text-center text-xs text-brand-blue font-bold py-1.5">Logo Ativa</span>
                          )}
                          <button onClick={() => handleDeleteLogo(logoUrl)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-colors cursor-pointer" title="Excluir logo">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {extractAllLogos(profile.logo_url).length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400">
                      <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                      <p className="text-sm font-medium">Nenhum logotipo enviado ainda.</p>
                      <p className="text-xs">Faça o upload do seu primeiro logo abaixo.</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-brand-border pt-6 flex flex-col items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-brand-dark">Adicionar Novo Logotipo</p>
                    <p className="text-xs text-slate-500 mt-0.5">Suporta PNG e JPG de até 5MB. Você pode adicionar múltiplos logotipos.</p>
                  </div>
                  <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  <Button type="button" variant="outline" className="gap-2 cursor-pointer" disabled={uploadingLogo} onClick={() => document.getElementById('logo-upload')?.click()}>
                    {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    {uploadingLogo ? 'Enviando...' : 'Fazer Upload de Logo'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'vendedor' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dados do Usuário / Vendedor</CardTitle>
                <CardDescription>Gerencie sua foto de perfil, informações de contato e assinatura padrão.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-brand-border bg-gradient-to-tr from-brand-blue to-brand-blue-hover">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Sua foto de perfil" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-bold uppercase text-white">
                          {(profile.seller_name || profile.name || user?.email || 'U').charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
                        <Camera className="h-4 w-4 text-brand-blue" />
                        Foto de perfil
                      </h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">
                        PNG, JPG ou WebP de até 2 MB. A foto será exibida no avatar do menu lateral do SaaS.
                      </p>
                      <input
                        id="profile-avatar-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar || removingAvatar}
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          disabled={uploadingAvatar || removingAvatar}
                          onClick={() => document.getElementById('profile-avatar-upload')?.click()}
                        >
                          {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                          {uploadingAvatar ? 'Enviando...' : profile.avatar_url ? 'Trocar foto' : 'Adicionar foto'}
                        </Button>
                        {profile.avatar_url && (
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 text-red-500 hover:text-red-600"
                            disabled={uploadingAvatar || removingAvatar}
                            onClick={() => void handleRemoveAvatar()}
                          >
                            {removingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            {removingAvatar ? 'Removendo...' : 'Remover foto'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Seu Nome (como Vendedor)</label>
                    <input name="seller_name" value={profile.seller_name || profile.name || ''} onChange={handleChange} className={inputClassName} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Seu Telefone / WhatsApp</label>
                    <input name="seller_phone" value={profile.seller_phone || ''} onChange={handleChange} className={inputClassName} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-brand-dark">Seu E-mail</label>
                    <input name="seller_email" type="email" value={profile.seller_email || ''} onChange={handleChange} className={inputClassName} />
                  </div>
                </div>

                <div className="border-t border-brand-border pt-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-brand-dark">
                        <PenLine className="h-4 w-4 text-brand-blue" />
                        Assinatura do vendedor
                      </h4>
                      <p className="mt-1 text-xs text-slate-500">PNG transparente, JPG ou SVG. Ela será aplicada automaticamente no final do PDF.</p>
                    </div>
                    {profile.seller_signature_url && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">Assinatura ativa</span>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-surface p-4">
                    {profile.seller_signature_url ? (
                      <div className="flex min-h-28 items-center justify-center rounded-lg bg-white p-5">
                        <img src={profile.seller_signature_url} alt="Assinatura do vendedor" className="max-h-24 max-w-full object-contain" />
                      </div>
                    ) : (
                      <div className="flex min-h-28 flex-col items-center justify-center text-center">
                        <PenLine className="mb-2 h-8 w-8 text-slate-500" />
                        <p className="text-sm font-medium text-brand-dark">Nenhuma assinatura enviada</p>
                        <p className="mt-1 text-xs text-slate-500">Envie a assinatura para preencher automaticamente o campo no PDF.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <input id="seller-signature-upload" type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,.svg" className="hidden" onChange={handleSignatureUpload} disabled={uploadingSignature} />
                    {profile.seller_signature_url && (
                      <Button type="button" variant="outline" className="gap-2" onClick={handleRemoveSignature}>
                        <Trash2 className="h-4 w-4" />
                        Remover assinatura
                      </Button>
                    )}
                    <Button type="button" className="gap-2" disabled={uploadingSignature} onClick={() => document.getElementById('seller-signature-upload')?.click()}>
                      {uploadingSignature ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingSignature ? 'Enviando...' : profile.seller_signature_url ? 'Trocar assinatura' : 'Adicionar assinatura'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'customizacao' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5 text-brand-blue" />
                    Customização da Conta
                  </CardTitle>
                  <CardDescription>Use o motor de cores para trocar a paleta visual da plataforma em tempo real.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {PLATFORM_THEME_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset.seed)}
                        className="rounded-xl border border-brand-border bg-brand-surface p-4 text-left transition hover:border-brand-blue hover:bg-gray-50/70"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-brand-dark">{preset.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{preset.description}</p>
                          </div>
                          <div className="flex -space-x-2">
                            {[preset.seed.background, preset.seed.primary, preset.seed.accent, preset.seed.warning, preset.seed.success].map((color) => (
                              <span key={color} className="h-7 w-7 rounded-full border border-brand-border" style={{ background: color }} />
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-brand-surface p-5">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-brand-dark">Motor de Cores</h3>
                        <p className="text-xs text-slate-500">Altere as cores-base. O sistema gera automaticamente hover, cards, bordas e contraste.</p>
                      </div>
                      <div className="flex rounded-lg border border-brand-border bg-gray-50 p-1 text-xs">
                        <button type="button" onClick={() => updateThemeSeed('mode', 'dark')} className={`rounded-md px-3 py-1.5 ${themeSeed.mode === 'dark' ? 'bg-brand-blue text-white' : 'text-slate-500'}`}>Escuro</button>
                        <button type="button" onClick={() => updateThemeSeed('mode', 'light')} className={`rounded-md px-3 py-1.5 ${themeSeed.mode === 'light' ? 'bg-brand-blue text-white' : 'text-slate-500'}`}>Claro</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {([
                        ['primary', 'Cor Primária'],
                        ['accent', 'Cor Secundária'],
                        ['background', 'Fundo da Plataforma'],
                        ['warning', 'Cor Solar / Destaque'],
                        ['success', 'Cor de Sucesso'],
                      ] as Array<[keyof PlatformThemeSeed, string]>).map(([field, label]) => (
                        <div key={field} className="space-y-2">
                          <label className="text-sm font-medium text-brand-dark">{label}</label>
                          <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3">
                            <input type="color" value={themeSeed[field]} onChange={(event) => updateThemeSeed(field, event.target.value)} className={colorInputClassName} />
                            <input value={themeSeed[field]} onChange={(event) => updateThemeSeed(field, event.target.value)} className={inputClassName} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-brand-gray p-5 shadow-inner">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.24em] text-brand-blue">Prévia ao vivo</p>
                      <span className="rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-xs text-slate-500">{themeSeed.mode === 'dark' ? 'Tema escuro' : 'Tema claro'}</span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
                        <p className="text-xs text-slate-500">Clientes ativos</p>
                        <p className="mt-2 text-2xl font-bold text-brand-dark">24</p>
                      </div>
                      <div className="rounded-xl border border-brand-border bg-gray-50 p-4">
                        <p className="text-xs text-slate-500">Vendido no mês</p>
                        <p className="mt-2 text-2xl font-bold text-brand-green">R$ 87k</p>
                      </div>
                      <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
                        <p className="text-xs text-slate-500">Propostas</p>
                        <p className="mt-2 text-2xl font-bold text-brand-yellow">12</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" className="gap-2"><Sparkles className="h-4 w-4" /> Botão primário</Button>
                      <Button type="button" variant="outline">Botão secundário</Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                    {[
                      ['Primária', themePalette.primary],
                      ['Hover', themePalette.primaryHover],
                      ['Superfície', themePalette.surface],
                      ['Borda', themePalette.border],
                      ['Texto', themePalette.text],
                      ['Mutado', themePalette.mutedText],
                      ['Sucesso', themePalette.success],
                      ['Solar', themePalette.warning],
                    ].map(([label, color]) => (
                      <div key={label} className="rounded-lg border border-brand-border bg-brand-surface p-3">
                        <span className="mb-2 block h-8 rounded-md border border-brand-border" style={{ background: color }} />
                        <p className="font-medium text-brand-dark">{label}</p>
                        <p className="text-slate-500">{color}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" className="gap-2" onClick={handleResetTheme}>
                      <RotateCcw className="h-4 w-4" /> Restaurar padrão
                    </Button>
                    <Button type="button" className="gap-2" onClick={handleSaveTheme} disabled={isSavingTheme}>
                      {isSavingTheme ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {isSavingTheme ? 'Salvando...' : 'Salvar paleta da plataforma'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'preferencias' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Preferências Comerciais</CardTitle>
                <CardDescription>Defina os padrões para a geração de novas propostas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Margem de Lucro Padrão (%)</label>
                  <input type="number" name="default_margin_percentage" value={profile.default_margin_percentage || ''} onChange={handleNumberChange} className={inputClassName} />
                  <p className="text-xs text-slate-500">Esta margem será aplicada automaticamente ao criar uma nova proposta.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-dark">Validade Padrão da Proposta (Dias)</label>
                  <input type="number" name="default_validity_days" value={profile.default_validity_days || 7} onChange={handleNumberChange} className={inputClassName} />
                  <p className="text-xs text-slate-500">Determina a data de expiração calculada a partir da data de criação.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'seguranca' && (
            <div className="space-y-6">
              <MfaSettingsCard
                userId={user?.id || profile.id}
                profile={profile}
                onProfileChange={setProfile}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Lock className="w-5 h-5 text-brand-blue" /> Alterar Senha</CardTitle>
                  <CardDescription>Altere a senha de acesso à sua conta.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="space-y-4">
                    {passwordErrorMessage && <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">{passwordErrorMessage}</div>}
                    {passwordSuccessMessage && <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg font-medium">{passwordSuccessMessage}</div>}
                    <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Senha Atual</label><input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className={inputClassName} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Nova Senha</label><input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClassName} /></div>
                      <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Confirmar Nova Senha</label><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClassName} /></div>
                    </div>
                    <div className="flex justify-end pt-2"><Button type="submit" disabled={isUpdatingPassword} className="gap-2">{isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}{isUpdatingPassword ? 'Enviando...' : 'Alterar Senha'}</Button></div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'encerramento' && (
            <Card className="border-red-200">
              <CardHeader className="bg-red-50/50 border-b border-red-100 rounded-t-xl">
                <CardTitle className="text-lg text-red-700 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" /> Encerramento da Conta</CardTitle>
                <CardDescription className="text-red-600/80">Esta ação é permanente e irreversível.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleDeleteAccount} className="space-y-4">
                  {deleteErrorMessage && <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg whitespace-pre-wrap">{deleteErrorMessage}</div>}
                  {deleteSuccessMessage && <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg font-medium">{deleteSuccessMessage}</div>}
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm space-y-2"><p className="font-semibold flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />Aviso Importante:</p><p className="text-xs text-amber-700 leading-relaxed">Para concluir a exclusão definitiva, digite exatamente a frase de confirmação e sua senha atual.</p></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Confirme digitando <strong className="text-red-600">excluir a conta</strong>:</label><input type="text" value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} className={inputClassName} /></div>
                  <div className="space-y-2"><label className="text-sm font-medium text-brand-dark">Sua Senha Atual</label><input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} className={inputClassName} /></div>
                  <div className="flex justify-end pt-4 border-t border-brand-border"><Button type="submit" variant="destructive" disabled={isDeletingAccount} className="gap-2 bg-red-600 hover:bg-red-700 text-white border-none">{isDeletingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}{isDeletingAccount ? 'Excluindo conta...' : 'Excluir Minha Conta Permanentemente'}</Button></div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab !== 'seguranca' && activeTab !== 'encerramento' && activeTab !== 'customizacao' && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} className="gap-2" disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
