import { expect, test } from '@playwright/test';
import { createPetPlaceState, expectImageLoaded, installPetPlaceApiMock } from '../e2e/support/pet-place-fixture';

const pause = () => test.info().project.name.includes('tutorial') ? 700 : 0;

test.beforeEach(async ({ page }) => {
  const state = createPetPlaceState();
  await installPetPlaceApiMock(page, state);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Alexandre/ }).first()).toBeVisible();
  await page.waitForTimeout(pause());
});

test('01 - tour financeiro: mensalidade, comprovante e transparencia', async ({ page }) => {
  await expect(page.getByText(/Mensalidade:/)).toBeVisible();
  await page.waitForTimeout(pause());

  await page.getByRole('button', { name: /Detalhes/ }).click();
  await expect(page.getByText(/Meus Pagamentos/)).toBeVisible();
  await page.waitForTimeout(pause());

  await page.getByRole('button', { name: /Ver Comprovante/ }).first().click();
  await expect(page.getByText(/Comprovante:/)).toBeVisible();
  await expectImageLoaded(page.locator('[class*="fixed"] img').last());
  await page.waitForTimeout(pause());

  await page.mouse.click(20, 20);
  await page.waitForTimeout(300);
  await page.mouse.click(20, 20);
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Extrato' }).click();
  await expect(page.getByText(/Hist.*rico do Caixa/)).toBeVisible();
  await expect(page.getByText('- R$ 150.00').first()).toBeVisible();
  await page.waitForTimeout(pause());
});

test('02 - tour social: comunidade, publicacao, mencao e comentario', async ({ page }) => {
  await page.getByText('Comunidade').click();
  await page.getByPlaceholder('Buscar...').fill('Belinha');
  await expect(page.getByText('Belinha')).toBeVisible();
  await expectImageLoaded(page.getByAltText('Belinha').first());
  await page.waitForTimeout(pause());

  await page.getByRole('button').filter({ hasText: /In/ }).click();
  await page.getByRole('button', { name: /Nova publica/ }).click();
  await page.getByPlaceholder(/O que/).fill('Oi @Ma');
  const marielleSuggestion = page.getByRole('button').filter({ hasText: 'Marielle Santos' }).filter({ hasText: 'Pessoa' });
  await expect(marielleSuggestion).toBeVisible();
  await page.waitForTimeout(pause());
  await marielleSuggestion.click();
  await page.getByPlaceholder(/O que/).fill('Oi @Marielle Santos, olha a Amora no Pet Place');
  await page.getByRole('button', { name: 'Postar' }).click();
  await expect(page.getByText(/olha a Amora/)).toBeVisible();
  await page.waitForTimeout(pause());

  await page.locator('button[aria-label*="Coment"]').first().click();
  await page.getByPlaceholder(/Adicionar um coment/).fill('Comentario de exemplo para tutorial');
  await page.locator('button[aria-label*="Enviar"]').click();
  await expect(page.getByText('Comentario de exemplo para tutorial')).toBeVisible();
  await page.waitForTimeout(pause());
});

test('03 - tour admin: pagamento externo', async ({ page }) => {
  await page.getByRole('button', { name: 'Admin' }).click();
  await page.getByRole('button', { name: /Pessoas/ }).click();
  await page.waitForTimeout(pause());

  await page.getByRole('button', { name: /Pagamento externo/ }).click();
  await page.getByPlaceholder('Nome da pessoa').fill('Carla Martins');
  await page.getByPlaceholder('(47) 99999-9999').fill('(47) 95555-4444');
  await page.getByPlaceholder('Nome do pet (opcional)').fill('Luna');
  await page.locator('input[type="month"]').fill('2026-05');
  await page.locator('input[type="number"]').first().fill('25');
  await page.getByTestId('manual-payment-proof-input').setInputFiles({
    name: 'comprovante.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-image'),
  });
  await page.waitForTimeout(pause());

  await page.getByRole('button', { name: /Registrar no caixa/ }).click();
  await expect(page.getByText(/Pessoa e comprovante registrados/)).toBeVisible();
  await page.waitForTimeout(pause());
});
