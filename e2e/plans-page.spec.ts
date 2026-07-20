import { expect, test } from '@playwright/test';

test.describe('Página pública de planos', () => {
  test('apresenta os três cards e os limites comerciais aprovados', async ({ page }) => {
    await page.goto('/planos');

    await expect(page.getByRole('heading', {
      name: 'Escolha o plano ideal para gerar propostas mais profissionais',
    })).toBeVisible();

    for (const planName of ['Gratuito', 'Pro Mensal', 'Pro Anual']) {
      await expect(page.getByRole('heading', { name: planName, exact: true })).toBeVisible();
    }

    await expect(page.getByText('5 propostas por mês', { exact: true })).toBeVisible();
    await expect(page.getByText('30 propostas por mês', { exact: true })).toBeVisible();
    await expect(page.getByText('40 propostas por mês', { exact: true })).toBeVisible();
    await expect(page.getByText('Melhor custo-benefício', { exact: true })).toBeVisible();
    await expect(page.getByText(/usuários? com login/i)).toHaveCount(0);
  });

  test('mantém preços como alias público e leva o plano gratuito ao cadastro', async ({ page }) => {
    await page.goto('/precos');
    await expect(page).toHaveURL(/\/planos$/);

    await page.getByRole('link', { name: 'Começar gratuitamente', exact: true }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('heading', { name: 'Criar Conta' })).toBeVisible();
  });
});
