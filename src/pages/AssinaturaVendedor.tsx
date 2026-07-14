import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Upload, Loader2, Trash2, PenLine } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import { Profile } from '../types/profile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DatabaseSetupAlert } from '../components/ui/DatabaseSetupAlert';

export function AssinaturaVendedor() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const data = await profileService.getProfile(user.id);
        setProfile(data);
      } catch (err) {
        console.error('Error loading profile:', err);
        setLoadError(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleSignatureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !profile || !event.target.files?.length) return;

    const file = event.target.files[0];

    try {
      setIsUploading(true);
      const url = await profileService.uploadSellerSignature(file, user.id);
      const nextProfile = { ...profile, seller_signature_url: url };
      setProfile(nextProfile);
      await profileService.updateProfile(user.id, { seller_signature_url: url });
      toast.success('Assinatura enviada com sucesso.');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar assinatura.');
    } finally {
      setIsUploading(false);
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
      toast.error(err?.message || 'Erro ao remover assinatura.');
    }
  };

  if (isLoading) {
    return <div className="text-brand-blue animate-pulse">Carregando assinatura...</div>;
  }

  if (loadError) {
    return <DatabaseSetupAlert error={loadError} resourceName="sua assinatura" />;
  }

  if (!profile) {
    return <div className="text-red-500">Não foi possível carregar os dados do vendedor.</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-light">Dados do vendedor</p>
        <h1 className="mt-2 text-2xl font-bold text-brand-dark">Assinatura do vendedor</h1>
        <p className="mt-1 text-sm text-slate-500">
          Envie a assinatura que será aplicada automaticamente no fechamento das propostas em PDF.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PenLine className="h-5 w-5 text-brand-blue" />
            Assinatura padrão
          </CardTitle>
          <CardDescription>
            Use PNG transparente, JPG ou SVG. Para melhor acabamento no PDF, prefira PNG transparente ou SVG com fundo transparente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface p-6">
            {profile.seller_signature_url ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex min-h-32 w-full items-center justify-center rounded-lg bg-white p-6">
                  <img
                    src={profile.seller_signature_url}
                    alt="Assinatura do vendedor"
                    className="max-h-28 max-w-full object-contain"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-brand-dark">Assinatura ativa</p>
                  <p className="mt-1 text-xs text-slate-500">Ela será inserida automaticamente no final do PDF.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <PenLine className="mb-3 h-10 w-10 text-slate-500" />
                <p className="text-sm font-medium text-brand-dark">Nenhuma assinatura enviada</p>
                <p className="mt-1 max-w-md text-xs text-slate-500">
                  Envie uma imagem da assinatura para preencher automaticamente o campo do vendedor no PDF.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <input
              id="seller-signature-upload"
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,.svg"
              className="hidden"
              onChange={handleSignatureUpload}
              disabled={isUploading}
            />
            {profile.seller_signature_url && (
              <Button type="button" variant="outline" className="gap-2" onClick={handleRemoveSignature}>
                <Trash2 className="h-4 w-4" />
                Remover assinatura
              </Button>
            )}
            <Button
              type="button"
              className="gap-2"
              disabled={isUploading}
              onClick={() => document.getElementById('seller-signature-upload')?.click()}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isUploading ? 'Enviando...' : profile.seller_signature_url ? 'Trocar assinatura' : 'Adicionar assinatura'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
