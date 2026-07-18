import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { loginSchema, LoginFormValues } from '../../lib/validations/auth.schema';
import { supabase } from '../../lib/supabase/client';
import { AnimatedLoginLogo } from '../brand/AnimatedLoginLogo';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/Card';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <Card className="mx-auto w-full max-w-md overflow-visible">
      <CardHeader className="space-y-2 pt-7 text-center">
        <div className="mx-auto mb-3 w-full max-w-[250px] px-2">
          <AnimatedLoginLogo />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Login</CardTitle>
        <CardDescription>Entre com suas credenciais para acessar a plataforma.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="seu@email.com" {...register('email')} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link to="/forgot-password" className="text-sm text-brand-blue hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <Input id="password" type="password" placeholder="******" {...register('password')} />
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Entrar
          </Button>
          <div className="text-center text-sm text-slate-500">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-brand-blue hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
