import type { ClientFormValues } from '../validations/client.schema';
import type { Client } from '../../types/client';

export type NormalizedClientValues = Omit<ClientFormValues, 'avg_consumption_kwh'> & {
  avg_consumption_kwh: number | null;
};

export type ClientInsertValues = NormalizedClientValues & {
  user_id: string;
};

export interface ClientRepository {
  list(): Promise<Client[]>;
  getById(id: string): Promise<Client>;
  insert(values: ClientInsertValues): Promise<Client>;
  update(id: string, values: NormalizedClientValues): Promise<Client>;
  remove(id: string): Promise<void>;
}

function normalizeOptionalText(value: string | undefined) {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeClientFormValues(values: ClientFormValues): NormalizedClientValues {
  const rawConsumption = values.avg_consumption_kwh;
  const parsedConsumption = rawConsumption === '' || rawConsumption === undefined
    ? null
    : Number(rawConsumption);

  return {
    ...values,
    name: values.name.trim(),
    document: normalizeOptionalText(values.document),
    email: normalizeOptionalText(values.email),
    phone: normalizeOptionalText(values.phone),
    cep: normalizeOptionalText(values.cep),
    address: normalizeOptionalText(values.address),
    number: normalizeOptionalText(values.number),
    neighborhood: normalizeOptionalText(values.neighborhood),
    complement: normalizeOptionalText(values.complement),
    city: normalizeOptionalText(values.city),
    state: normalizeOptionalText(values.state),
    notes: normalizeOptionalText(values.notes),
    avg_consumption_kwh: parsedConsumption !== null && Number.isFinite(parsedConsumption)
      ? parsedConsumption
      : null,
  };
}

export function clientToFormValues(client: Client): ClientFormValues {
  return {
    name: client.name,
    document: client.document || '',
    email: client.email || '',
    phone: client.phone || '',
    cep: client.cep || '',
    address: client.address || '',
    number: client.number || '',
    neighborhood: client.neighborhood || '',
    complement: client.complement || '',
    city: client.city || '',
    state: client.state || '',
    avg_consumption_kwh: client.avg_consumption_kwh ?? '',
    notes: client.notes || '',
  };
}

export function filterClients(clients: Client[], searchTerm: string) {
  const term = searchTerm.trim().toLocaleLowerCase('pt-BR');
  if (!term) return clients;

  return clients.filter((client) => {
    const fields = [client.name, client.email, client.document, client.phone];
    return fields.some((field) => field?.toLocaleLowerCase('pt-BR').includes(term));
  });
}

export function createClientOperations(repository: ClientRepository) {
  return {
    getClients() {
      return repository.list();
    },

    getClientById(id: string) {
      return repository.getById(id);
    },

    createClient(values: ClientFormValues, userId: string) {
      return repository.insert({
        ...normalizeClientFormValues(values),
        user_id: userId,
      });
    },

    updateClient(id: string, values: ClientFormValues) {
      return repository.update(id, normalizeClientFormValues(values));
    },

    deleteClient(id: string) {
      return repository.remove(id);
    },
  };
}
