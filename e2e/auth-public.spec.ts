import { expect, test } from '@playwright/test';

const PUBLIC_TOKEN = '1234567890abcdef1234567890abcdef';

function publicProposalPayload(status: string) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'PROP-E2E-001',
    title: 'Sistema Fotovoltaico Residencial',
    status,
    created_at: '2026-07-19T00:00:00.000Z',
    final_price: 24500,
    pdf_available: false,
    client: {
      name: 'Cliente Playwright',
      city: 'São Paulo',
      state: 'SP',
    },
    company: {
      name: 'SolAmigo Energia Solar',
      logo_url: null,
    },
    solar: {
      installed_power_kwp: 6.6,
      monthly_savings: 780,
      payback_formatted: '3 anos e 2 meses',
    },
    solar_kit_snapshot: {
      name: 'Kit Solar E2E',
      kit_power_kwp: 6.6,
      module_quantity: 12,
      module_power_w: 550,
      inverter_power_kw: 6,
      supplier: 'Fornecedor Teste',
    },
  };
}

test.describe('Autenticação e rotas públicas', () => {
  test('exibe o login e valida os campos obrigatórios', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.getByLabel('E-mail')).toBeVisible();
    await expect(page.getByLabel('Senha')).toBeVisible();

    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('E-mail inválido')).toBeVisible();
    await expect(page.getByText('A senha deve ter pelo menos 6 caracteres')).toBeVisible();
  });

  test('navega entre login, recuperação e cadastro', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: 'Esqueceu a senha?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { name: 'Recuperar Senha' })).toBeVisible();

    await page.getByRole('link', { name: 'Voltar para o Login' }).click();
    await page.getByRole('link', { name: 'Cadastre-se' }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Criar Conta' })).toBeVisible();
  });

  test('envia solicitação de recuperação sem revelar se a conta existe', async ({ page }) => {
    await page.route('**/auth/v1/recover', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{}',
      });
    });

    await page.goto('/forgot-password');
    await page.getByLabel('E-mail').fill('usuario@exemplo.com');
    await page.getByRole('button', { name: 'Enviar Link' }).click();

    await expect(page.getByText(
      'Se uma conta existir para este e-mail, enviamos instruções de redefinição de senha.',
    )).toBeVisible();
  });

  test('redireciona uma sessão anônima para o login', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('mostra erro controlado para token público inválido', async ({ page }) => {
    await page.goto('/proposta/curto');

    await expect(page.getByRole('heading', { name: 'Ops!' })).toBeVisible();
    await expect(page.getByText('Proposta não encontrada')).toBeVisible();
  });

  test('carrega e aprova uma proposta pelo link público', async ({ page }) => {
    let status = 'viewed';

    await page.route('**/rest/v1/rpc/get_public_proposal', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(publicProposalPayload(status)),
      });
    });

    await page.route('**/rest/v1/rpc/update_public_proposal_status', async (route) => {
      const request = route.request().postDataJSON() as { p_status?: string };
      status = request.p_status === 'approved' ? 'approved' : 'rejected';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status }),
      });
    });

    await page.goto(`/proposta/${PUBLIC_TOKEN}`);

    await expect(page.getByRole('heading', { name: 'SolAmigo Energia Solar' })).toBeVisible();
    await expect(page.getByText('Cliente Playwright')).toBeVisible();
    await expect(page.getByText('6.60 kWp')).toBeVisible();
    await expect(page.getByText('Kit selecionado: Kit Solar E2E')).toBeVisible();

    await page.getByRole('button', { name: 'Aceitar Proposta' }).click();

    await expect(page.getByText('Proposta aceita com sucesso!')).toBeVisible();
    await expect(page.getByText('Aprovada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aceitar Proposta' })).toHaveCount(0);
  });

  test('permite informar o motivo e recusar a proposta', async ({ page }) => {
    let status = 'viewed';
    let receivedReason: string | null = null;

    await page.route('**/rest/v1/rpc/get_public_proposal', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(publicProposalPayload(status)),
      });
    });

    await page.route('**/rest/v1/rpc/update_public_proposal_status', async (route) => {
      const request = route.request().postDataJSON() as {
        p_status?: string;
        p_reason?: string | null;
      };
      status = request.p_status === 'rejected' ? 'rejected' : 'approved';
      receivedReason = request.p_reason || null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status }),
      });
    });

    await page.goto(`/proposta/${PUBLIC_TOKEN}`);
    await page.getByRole('button', { name: 'Recusar Proposta' }).click();
    await page.getByPlaceholder(/Achei o valor alto/).fill('Projeto adiado pelo cliente');
    await page.getByRole('button', { name: 'Confirmar Recusa' }).click();

    await expect.poll(() => receivedReason).toBe('Projeto adiado pelo cliente');
    await expect(page.getByText('Proposta recusada.')).toBeVisible();
    await expect(page.getByText('Recusada')).toBeVisible();
  });
});
