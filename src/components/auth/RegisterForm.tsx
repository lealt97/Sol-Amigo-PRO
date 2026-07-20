import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema, RegisterFormValues } from '../../lib/validations/auth.schema';
import { REQUIRED_LEGAL_ACCEPTANCES } from '../../lib/legal/legalCatalog';
import { supabase } from '../../lib/supabase/client';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';
import { translateAuthError } from '../../lib/utils';

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          name: data.name,
          company_name: data.company_name,
          phone: data.phone,
          legal_acceptances: REQUIRED_LEGAL_ACCEPTANCES,
        },
      },
    });

    if (signUpError) {
      setError(translateAuthError(signUpError.message));
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-500">Cadastro realizado!</CardTitle>
          <CardDescription>
            Verifique seu e-mail para confirmar a conta, depois faça login para iniciar a configuração guiada.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Ir para Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Criar Conta</CardTitle>
        <CardDescription>Preencha os dados para criar sua conta no SolAmigo Propostas FV.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input id="name" placeholder="Seu Nome" {...register('name')} />
            {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name">Nome da Empresa</Label>
            <Input id="company_name" placeholder="Sua Empresa Solar" {...register('company_name')} />
            {errors.company_name && <p className="text-sm text-red-600">{errors.company_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input id="phone" placeholder="(11) 99999-9999" {...register('phone')} />
            {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="******" {...register('password')} />
              {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input id="confirmPassword" type="password" placeholder="******" {...register('confirmPassword')} />
              {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>}
            </div>
          </div>

          <div className="rounded-xl border border-brand-border bg-brand-gray/70 p-4">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-brand-border text-brand-blue focus:ring-brand-blue"
                {...register('acceptedLegal')}
              />
              <span className="leading-6">
                Li e aceito os{' '}
                <Link to="/termos" target="_blank" className="font-semibold text-brand-blue hover:underline">Termos de Uso</Link>, a{' '}
                <Link to="/privacidade" target="_blank" className="font-semibold text-brand-blue hover:underline">Política de Privacidade</Link>{' '}
                e a{' '}
                <Link to="/cancelamento-reembolso" target="_blank" className="font-semibold text-brand-blue hover:underline">Política de Cancelamento e Reembolso</Link>.
              </span>
            </label>
            {errors.acceptedLegal && <p className="mt-2 text-sm text-red-600">{errors.acceptedLegal.message}</p>}
            <p className="mt-2 text-xs leading-5 text-amber-700">
              Os documentos atuais são minutas para o beta controlado e permanecem sujeitos à revisão jurídica antes do lançamento comercial aberto.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Criar Conta
          </Button>
          <div className="text-center text-sm text-slate-500">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-brand-blue hover:underline">
              Faça login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
