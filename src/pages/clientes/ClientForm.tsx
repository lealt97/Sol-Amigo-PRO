import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema, ClientFormValues } from '../../lib/validations/client.schema';
import { formatBrazilianPhoneInput } from '../../lib/formatters/phone';
import { clientService } from '../../services/clientService';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardContent, CardFooter } from '../../components/ui/Card';
import { ArrowLeft } from 'lucide-react';

export function ClientForm() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
  });

  useEffect(() => {
    async function loadClient() {
      if (!id) return;
      try {
        const client = await clientService.getClientById(id);
        reset({
          name: client.name,
          document: client.document || '',
          email: client.email || '',
          phone: formatBrazilianPhoneInput(client.phone || ''),
          cep: client.cep || '',
          address: client.address || '',
          number: client.number || '',
          neighborhood: client.neighborhood || '',
          complement: client.complement || '',
          city: client.city || '',
          state: client.state || '',
          avg_consumption_kwh: client.avg_consumption_kwh || '',
          notes: client.notes || '',
        });
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar cliente');
      } finally {
        setIsLoading(false);
      }
    }
    loadClient();
  }, [id, reset]);

  const onSubmit = async (data: ClientFormValues) => {
    if (!user) return;
    setError(null);
    try {
      const formattedData = {
        ...data,
        avg_consumption_kwh: data.avg_consumption_kwh ? Number(data.avg_consumption_kwh) : undefined,
      };

      if (isEditing) {
        await clientService.updateClient(id, formattedData as any);
        navigate(`/clientes/${id}`);
      } else {
        const newClient = await clientService.createClient(formattedData as any, user.id);
        navigate(`/clientes/${newClient.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar cliente');
    }
  };

  if (isLoading) {
    return <div className="text-brand-blue animate-pulse">Carregando formulário...</div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-4">
        <Link to={isEditing ? `/clientes/${id}` : '/clientes'}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </h1>
          <p className="text-sm text-slate-500">
            Preencha os dados do cliente para gerar propostas futuras.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="space-y-6 pt-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome / Razão Social *</Label>
                <Input id="name" placeholder="Nome do cliente" {...register('name')} />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="document">CPF / CNPJ</Label>
                <Input id="document" placeholder="000.000.000-00" {...register('document')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="cliente@email.com" {...register('email')} />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <Input id="phone" type="tel" placeholder="(00) 00000-0000" autoComplete="tel" {...register('phone')} />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="border-t border-brand-border pt-6">
              <h3 className="text-lg font-medium text-brand-dark mb-4">Endereço</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" placeholder="00000-000" {...register('cep')} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input id="address" placeholder="Rua, Avenida, etc." {...register('address')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input id="number" placeholder="123" {...register('number')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input id="complement" placeholder="Apto, Sala, etc." {...register('complement')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input id="neighborhood" placeholder="Centro" {...register('neighborhood')} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" placeholder="São Paulo" {...register('city')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" placeholder="SP" {...register('state')} />
                </div>
              </div>
            </div>

            <div className="border-t border-brand-border pt-6">
              <h3 className="text-lg font-medium text-brand-dark mb-4">Dados de Consumo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="avg_consumption_kwh">Consumo Médio (kWh/mês)</Label>
                  <Input
                    id="avg_consumption_kwh"
                    type="number"
                    placeholder="Ex: 500"
                    {...register('avg_consumption_kwh')}
                  />
                  {errors.avg_consumption_kwh && <p className="text-sm text-red-600">{errors.avg_consumption_kwh.message}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-brand-border pt-6">
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" placeholder="Informações adicionais sobre o cliente..." {...register('notes')} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 bg-brand-surface border-t border-brand-border rounded-b-xl py-4">
            <Link to={isEditing ? `/clientes/${id}` : '/clientes'}>
              <Button type="button" variant="ghost">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Salvar Alterações' : 'Criar Cliente'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
