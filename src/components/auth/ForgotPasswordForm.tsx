import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { getAuthErrorMessage, requestPasswordReset } from '../../lib/auth/authFlows';
import { forgotPasswordSchema, ForgotPasswordFormValues } from '../../lib/validations/auth.schema';
import { supabase } from '../../lib/supabase/client';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { translateAuthError } from '../../lib/utils';

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setError(null);
    setSuccess(false);

    try {
      const appBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
      await requestPasswordReset(supabase.auth, data.email, appBaseUrl);
      setSuccess(true);
    } catch (authError) {
      setError(translateAuthError(getAuthErrorMessage(authError)));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Recuperar Senha</CardTitle>
        <CardDescription>Digite seu e-mail para receber um link de redefinição de senha.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-500 bg-green-500/10 border border-green-500/20 rounded-md">
              Se uma conta existir para este e-mail, enviamos instruções de redefinição de senha.
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Enviar Link
          </Button>
          <div className="text-center text-sm text-slate-500">
            Lembrou a senha?{' '}
            <Link to="/login" className="text-brand-blue hover:underline">
              Voltar para o Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
