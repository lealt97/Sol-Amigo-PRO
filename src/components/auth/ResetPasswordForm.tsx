import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { getAuthErrorMessage, updateAccountPassword } from '../../lib/auth/authFlows';
import { resetPasswordSchema, ResetPasswordFormValues } from '../../lib/validations/auth.schema';
import { supabase } from '../../lib/supabase/client';
import { translateAuthError } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const pendingPassword = localStorage.getItem('pending_new_password') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: pendingPassword,
      confirmPassword: pendingPassword,
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setError(null);

    try {
      await updateAccountPassword(supabase.auth, data.password);
      localStorage.removeItem('pending_new_password');
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (authError) {
      setError(translateAuthError(getAuthErrorMessage(authError)));
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-500">Senha atualizada!</CardTitle>
          <CardDescription>
            Sua senha foi redefinida com sucesso. Redirecionando...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Nova Senha</CardTitle>
        <CardDescription>Digite a nova senha para sua conta.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
              {error}
            </div>
          )}
          {pendingPassword && (
            <div className="p-3 text-xs text-brand-blue bg-blue-50 border border-blue-100 rounded-lg">
              <p className="font-semibold">Senha Pré-carregada</p>
              <p className="mt-1 opacity-90">A nova senha solicitada nas Configurações foi carregada automaticamente. Basta clicar em <strong>Atualizar Senha</strong> abaixo para concluir com segurança!</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input id="password" type="password" placeholder="******" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input id="confirmPassword" type="password" placeholder="******" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Atualizar Senha
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
