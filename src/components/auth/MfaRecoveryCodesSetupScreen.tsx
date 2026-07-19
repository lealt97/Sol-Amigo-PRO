import { useState } from 'react';
import { Clipboard, Download, KeyRound, Loader2, LogOut, ShieldCheck, TriangleAlert } from 'lucide-react';
import { generateMfaRecoveryCodes } from '../../lib/auth/mfaRecovery';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';

type MfaRecoveryCodesSetupScreenProps = {
  onComplete: () => void;
  onSignOut: () => Promise<void>;
};

function buildRecoveryFile(codes: string[]) {
  return [
    'SolAmigo Pro — Códigos de recuperação MFA',
    '',
    'Cada código funciona uma única vez.',
    'Guarde este arquivo fora do dispositivo usado como autenticador.',
    '',
    ...codes.map((code, index) => `${String(index + 1).padStart(2, '0')}. ${code}`),
    '',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
  ].join('\n');
}

export function MfaRecoveryCodesSetupScreen({
  onComplete,
  onSignOut,
}: MfaRecoveryCodesSetupScreenProps) {
  const [codes, setCodes] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const generateCodes = async () => {
    setErrorMessage(null);
    setIsGenerating(true);

    try {
      const generatedCodes = await generateMfaRecoveryCodes();
      setCodes(generatedCodes);
      setAcknowledged(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível gerar os códigos de recuperação.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCodes = async () => {
    if (!codes.length) return;

    try {
      await navigator.clipboard.writeText(buildRecoveryFile(codes));
    } catch {
      setErrorMessage('Não foi possível copiar automaticamente. Faça o download ou copie cada código manualmente.');
    }
  };

  const downloadCodes = () => {
    if (!codes.length) return;

    const blob = new Blob([buildRecoveryFile(codes)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `solamigo-codigos-recuperacao-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-brand-gray p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue">
            <KeyRound className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">Proteja o acesso de emergência</CardTitle>
          <CardDescription>
            Gere e guarde dez códigos de recuperação. Eles permitem remover o MFA com segurança caso você perca o celular.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Os códigos aparecem somente nesta tela.</p>
              <p className="mt-1 text-xs leading-relaxed">
                Cada código funciona uma única vez. Armazene-os em um gerenciador de senhas ou em local físico seguro, separado do aplicativo autenticador.
              </p>
            </div>
          </div>

          {!codes.length ? (
            <div className="rounded-xl border border-dashed border-brand-border bg-brand-surface p-8 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-brand-blue" />
              <p className="mt-3 text-sm font-semibold text-brand-dark">Conclua a configuração do MFA</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                Ao gerar um novo conjunto, qualquer conjunto anterior ligado a este autenticador deixa de funcionar.
              </p>
              <Button type="button" className="mt-5 gap-2" disabled={isGenerating} onClick={() => void generateCodes()}>
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {isGenerating ? 'Gerando códigos...' : 'Gerar códigos de recuperação'}
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {codes.map((code, index) => (
                  <div key={code} className="flex items-center gap-3 rounded-lg border border-brand-border bg-gray-50 px-3 py-2">
                    <span className="w-6 text-right text-xs text-slate-400">{index + 1}.</span>
                    <code className="select-all text-sm font-semibold tracking-wide text-brand-dark">{code}</code>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button type="button" variant="outline" className="gap-2" onClick={() => void copyCodes()}>
                  <Clipboard className="h-4 w-4" />
                  Copiar todos
                </Button>
                <Button type="button" variant="outline" className="gap-2" onClick={downloadCodes}>
                  <Download className="h-4 w-4" />
                  Baixar arquivo
                </Button>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-brand-border bg-brand-surface p-4">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-brand-border text-brand-blue"
                />
                <span className="text-sm text-brand-dark">
                  Confirmo que salvei os códigos em um local seguro e entendo que eles não serão exibidos novamente.
                </span>
              </label>
            </>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" className="gap-2" disabled={isGenerating} onClick={() => void onSignOut()}>
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
          <Button type="button" className="gap-2" disabled={!codes.length || !acknowledged} onClick={onComplete}>
            <ShieldCheck className="h-4 w-4" />
            Concluir e acessar o sistema
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
