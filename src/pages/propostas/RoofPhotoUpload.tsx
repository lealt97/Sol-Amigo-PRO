import { useEffect, useId, useMemo, useState, type ChangeEvent } from 'react';
import { ImagePlus, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { storageAssetService } from '../../services/storageAssetService';

const storageKeyForClient = (clientId: string | null) => (
  `sol-amigo:roof-photo:${clientId || 'draft'}`
);

export function RoofPhotoUpload({ clientId }: { clientId: string | null }) {
  const inputId = useId();
  const { user } = useAuth();
  const storageKey = useMemo(() => storageKeyForClient(clientId), [clientId]);
  const [storageReference, setStorageReference] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const savedReference = sessionStorage.getItem(storageKey);
    setStorageReference(savedReference);
    setPreviewUrl(null);
    setError(null);

    if (savedReference) {
      void storageAssetService.resolveAssetUrl(savedReference, 900)
        .then((url) => {
          if (active) setPreviewUrl(url);
        })
        .catch((resolveError) => {
          if (!active) return;
          setError(resolveError instanceof Error
            ? resolveError.message
            : 'Não foi possível carregar a foto do telhado.');
        });
    }

    return () => {
      active = false;
    };
  }, [storageKey]);

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!user?.id) {
      setError('Usuário não autenticado.');
      return;
    }

    const previousReference = storageReference;
    const previousPreview = previewUrl;
    const localPreview = URL.createObjectURL(file);

    setError(null);
    setIsProcessing(true);
    setPreviewUrl(localPreview);

    try {
      const newReference = await storageAssetService.uploadRoofImage(file, user.id);
      const signedUrl = await storageAssetService.resolveAssetUrl(newReference, 900);

      sessionStorage.setItem(storageKey, newReference);
      setStorageReference(newReference);
      setPreviewUrl(signedUrl);
      toast.success('Foto do telhado adicionada.');

      if (previousReference && previousReference !== newReference) {
        void storageAssetService.removeRoofImage(previousReference, user.id).catch(() => undefined);
      }
    } catch (uploadError) {
      setPreviewUrl(previousPreview);
      const message = uploadError instanceof Error
        ? uploadError.message
        : 'Não foi possível enviar a foto do telhado.';
      setError(message);
      toast.error(message);
    } finally {
      URL.revokeObjectURL(localPreview);
      setIsProcessing(false);
    }
  };

  const handleRemove = async () => {
    if (!storageReference) {
      setPreviewUrl(null);
      sessionStorage.removeItem(storageKey);
      return;
    }

    if (!user?.id) {
      setError('Usuário não autenticado.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      await storageAssetService.removeRoofImage(storageReference, user.id);
      sessionStorage.removeItem(storageKey);
      setStorageReference(null);
      setPreviewUrl(null);
      toast.success('Foto do telhado removida.');
    } catch (removeError) {
      const message = removeError instanceof Error
        ? removeError.message
        : 'Não foi possível remover a foto do telhado.';
      setError(message);
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadInput = (
    <input
      id={inputId}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      capture="environment"
      className="sr-only"
      onChange={(event) => void handlePhotoChange(event)}
      disabled={isProcessing}
    />
  );

  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
          <ImagePlus className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-brand-dark">Foto do telhado do cliente</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Adicione uma imagem para registrar a área disponível e os obstáculos visíveis.
          </p>
        </div>
      </div>

      {previewUrl ? (
        <div className="mt-5 space-y-4">
          <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-gray/30">
            <img
              src={previewUrl}
              alt="Foto do telhado do cliente"
              className="h-64 w-full object-cover"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <label
              htmlFor={inputId}
              className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-brand-border bg-brand-surface px-4 text-sm font-semibold text-brand-dark transition hover:bg-brand-gray/50 ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
            >
              {uploadInput}
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Trocar foto
            </label>
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-red-600 hover:text-red-700"
              onClick={() => void handleRemove()}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4" /> Remover foto
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand-border px-6 py-10 text-center transition hover:border-brand-blue/50 hover:bg-brand-blue/5 ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
        >
          {uploadInput}
          {isProcessing ? (
            <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
          ) : (
            <Upload className="h-8 w-8 text-brand-blue" />
          )}
          <span className="mt-3 font-semibold text-brand-dark">
            {isProcessing ? 'Enviando foto...' : 'Selecionar ou tirar foto do telhado'}
          </span>
          <span className="mt-1 text-xs text-slate-500">JPG, PNG ou WebP — máximo de 8 MB</span>
        </label>
      )}

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
