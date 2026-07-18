import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  ClientRepository,
  createClientOperations,
  filterClients,
  normalizeClientFormValues,
} from '../src/lib/clients/clientFlows';
import { clientSchema, ClientFormValues } from '../src/lib/validations/client.schema';
import type { Client } from '../src/types/client';

const baseForm: ClientFormValues = {
  name: 'Empresa Solar',
  document: '12.345.678/0001-90',
  email: 'contato@empresa.com',
  phone: '(11) 99999-9999',
  cep: '01000-000',
  address: 'Avenida Solar',
  number: '100',
  neighborhood: 'Centro',
  complement: 'Sala 2',
  city: 'São Paulo',
  state: 'SP',
  avg_consumption_kwh: '650',
  notes: 'Cliente prioritário',
};

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-1',
    user_id: 'user-1',
    name: 'Empresa Solar',
    document: '12.345.678/0001-90',
    email: 'contato@empresa.com',
    phone: '(11) 99999-9999',
    cep: '01000-000',
    city: 'São Paulo',
    state: 'SP',
    address: 'Avenida Solar',
    number: '100',
    neighborhood: 'Centro',
    complement: 'Sala 2',
    avg_consumption_kwh: 650,
    notes: 'Cliente prioritário',
    status: 'active',
    created_at: '2026-07-18T12:00:00.000Z',
    updated_at: '2026-07-18T12:00:00.000Z',
    ...overrides,
  };
}

function createRepository(overrides: Partial<ClientRepository> = {}): ClientRepository {
  return {
    list: async () => [],
    getById: async (id) => makeClient({ id }),
    insert: async (values) => makeClient({
      user_id: values.user_id,
      name: values.name,
      avg_consumption_kwh: values.avg_consumption_kwh,
    }),
    update: async (id, values) => makeClient({
      id,
      name: values.name,
      avg_consumption_kwh: values.avg_consumption_kwh,
    }),
    remove: async () => undefined,
    ...overrides,
  };
}

test('valida os campos essenciais do cliente', () => {
  assert.equal(clientSchema.safeParse(baseForm).success, true);
  assert.equal(clientSchema.safeParse({ ...baseForm, name: 'AB' }).success, false);
  assert.equal(clientSchema.safeParse({ ...baseForm, email: 'email-invalido' }).success, false);
  assert.equal(clientSchema.safeParse({ ...baseForm, phone: '123' }).success, false);
});

test('normaliza textos e consumo médio antes da persistência', () => {
  const normalized = normalizeClientFormValues({
    ...baseForm,
    name: '  Empresa Solar  ',
    email: '  contato@empresa.com  ',
    avg_consumption_kwh: '650.5',
  });

  assert.equal(normalized.name, 'Empresa Solar');
  assert.equal(normalized.email, 'contato@empresa.com');
  assert.equal(normalized.avg_consumption_kwh, 650.5);
  assert.equal(normalizeClientFormValues({ ...baseForm, avg_consumption_kwh: '' }).avg_consumption_kwh, null);
  assert.equal(normalizeClientFormValues({ ...baseForm, avg_consumption_kwh: 'invalido' }).avg_consumption_kwh, null);
});

test('cadastra cliente vinculando o usuário autenticado', async () => {
  let receivedUserId = '';
  let receivedConsumption: number | null = null;
  const operations = createClientOperations(createRepository({
    insert: async (values) => {
      receivedUserId = values.user_id;
      receivedConsumption = values.avg_consumption_kwh;
      return makeClient({
        user_id: values.user_id,
        name: values.name,
        avg_consumption_kwh: values.avg_consumption_kwh,
      });
    },
  }));

  const created = await operations.createClient(baseForm, 'user-owner');

  assert.equal(receivedUserId, 'user-owner');
  assert.equal(receivedConsumption, 650);
  assert.equal(created.user_id, 'user-owner');
});

test('edita o cliente correto com os dados normalizados', async () => {
  let receivedId = '';
  let receivedName = '';
  const operations = createClientOperations(createRepository({
    update: async (id, values) => {
      receivedId = id;
      receivedName = values.name;
      return makeClient({ id, name: values.name });
    },
  }));

  const updated = await operations.updateClient('client-77', {
    ...baseForm,
    name: '  Cliente Atualizado  ',
  });

  assert.equal(receivedId, 'client-77');
  assert.equal(receivedName, 'Cliente Atualizado');
  assert.equal(updated.name, 'Cliente Atualizado');
});

test('exclui somente o cliente solicitado', async () => {
  const removedIds: string[] = [];
  const operations = createClientOperations(createRepository({
    remove: async (id) => {
      removedIds.push(id);
    },
  }));

  await operations.deleteClient('client-delete');
  assert.deepEqual(removedIds, ['client-delete']);
});

test('lista, localiza e propaga erros do repositório', async () => {
  const clients = [makeClient(), makeClient({ id: 'client-2', name: 'Outro Cliente' })];
  const operations = createClientOperations(createRepository({
    list: async () => clients,
    getById: async (id) => clients.find((client) => client.id === id) || Promise.reject(new Error('Cliente não encontrado')),
  }));

  assert.equal((await operations.getClients()).length, 2);
  assert.equal((await operations.getClientById('client-2')).name, 'Outro Cliente');
  await assert.rejects(() => operations.getClientById('inexistente'), /não encontrado/);
});

test('filtra clientes por nome, e-mail, documento ou telefone', () => {
  const clients = [
    makeClient(),
    makeClient({
      id: 'client-2',
      name: 'Comercial Horizonte',
      email: 'financeiro@horizonte.com',
      document: '98765432100',
      phone: '(21) 98888-7777',
    }),
  ];

  assert.deepEqual(filterClients(clients, 'horizonte').map((client) => client.id), ['client-2']);
  assert.deepEqual(filterClients(clients, 'FINANCEIRO').map((client) => client.id), ['client-2']);
  assert.deepEqual(filterClients(clients, '987654').map((client) => client.id), ['client-2']);
  assert.deepEqual(filterClients(clients, '98888').map((client) => client.id), ['client-2']);
  assert.equal(filterClients(clients, '').length, 2);
});
