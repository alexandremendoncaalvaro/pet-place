import { expect, test } from '@playwright/test';
import { join } from 'node:path';
import { createPetPlaceState, expectImageLoaded, installPetPlaceApiMock } from '../e2e/support/pet-place-fixture';

const mediaDir = join(process.cwd(), 'tests', 'fixtures', 'media');
const pause = () => test.info().project.name.includes('tutorial') ? 800 : 0;

test.beforeEach(async ({ page }) => {
  const state = createPetPlaceState();
  await installPetPlaceApiMock(page, state);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Alexandre/ }).first()).toBeVisible();
  await page.waitForTimeout(pause());
});

test('01 - tutorial post com imagem e mencao de pessoa', async ({ page }) => {
  await expect(page.getByText(/Mensalidade:/)).toBeVisible();
  await page.waitForTimeout(pause());

  await page.getByRole('button', { name: /Nova publica/ }).click();
  await page.getByPlaceholder(/O que/).fill('Foto do encontro de hoje com @Ma');
  const personSuggestion = page.getByRole('button').filter({ hasText: 'Marielle Santos' }).filter({ hasText: 'Pessoa' });
  await expect(personSuggestion).toBeVisible();
  await page.waitForTimeout(pause());

  await personSuggestion.click();
  await page.getByTestId('post-media-input').setInputFiles(join(mediaDir, 'tutorial-photo.svg'));
  await expectImageLoaded(page.getByAltText('preview'));
  await page.waitForTimeout(pause());

  await page.getByPlaceholder(/O que/).fill('Foto do encontro de hoje com @Marielle Santos no Pet Place');
  await page.getByRole('button', { name: 'Postar' }).click();
  await expect(page.getByText(/Foto do encontro de hoje/)).toBeVisible();
  await expectImageLoaded(page.getByAltText('Post media').first());
  await page.waitForTimeout(pause());

  await page.locator('button[aria-label*="Coment"]').first().click();
  await page.getByPlaceholder(/Adicionar um coment/).fill('Comentario de exemplo no tutorial');
  await page.locator('button[aria-label*="Enviar"]').click();
  await expect(page.getByText('Comentario de exemplo no tutorial')).toBeVisible();
  await page.waitForTimeout(pause());
});

test('02 - tutorial post com video e mencao de pet', async ({ page }) => {
  await page.getByRole('button', { name: /Nova publica/ }).click();
  await page.getByPlaceholder(/O que/).fill('Video rapido da brincadeira com @Be');
  const petSuggestion = page.getByRole('button').filter({ hasText: 'Belinha' }).filter({ hasText: /Pet de/ });
  await expect(petSuggestion).toBeVisible();
  await page.waitForTimeout(pause());

  await petSuggestion.click();
  await page.getByTestId('post-media-input').setInputFiles(join(mediaDir, 'tutorial-video.mp4'));
  await expect(page.locator('video').first()).toBeVisible();
  await expect(page.getByText('tutorial-video.mp4')).toBeVisible();
  await page.waitForTimeout(pause());

  await page.getByPlaceholder(/O que/).fill('Video rapido da brincadeira com @Belinha no Pet Place');
  await page.getByRole('button', { name: 'Postar' }).click();
  await expect(page.getByText(/Video rapido da brincadeira/)).toBeVisible();
  await expect(page.getByRole('button', { name: '@Belinha' }).first()).toBeVisible();
  await expect(page.locator('video').first()).toBeVisible();
  await page.waitForTimeout(pause());
});

test('03 - tutorial pagamento externo e transparencia', async ({ page }) => {
  await page.getByRole('button', { name: 'Admin' }).click();
  await page.getByRole('button', { name: /Pessoas/ }).click();
  await expect(page.getByText(/Pagamento externo/)).toBeVisible();
  await page.waitForTimeout(pause());

  await page.getByRole('button', { name: /Pagamento externo/ }).click();
  await page.getByPlaceholder('Nome da pessoa').fill('Carla Martins');
  await page.getByPlaceholder('(47) 99999-9999').fill('(47) 95555-4444');
  await page.getByPlaceholder('Nome do pet (opcional)').fill('Luna');
  await page.locator('input[type="month"]').fill('2026-05');
  await page.locator('input[type="number"]').first().fill('25');
  await page.getByTestId('manual-payment-proof-input').setInputFiles(join(mediaDir, 'tutorial-photo.svg'));
  await page.waitForTimeout(pause());

  await page.getByRole('button', { name: /Registrar no caixa/ }).click();
  await expect(page.getByText(/Pessoa e comprovante registrados/)).toBeVisible();
  await page.waitForTimeout(pause());

  await page.getByRole('button', { name: 'Extrato' }).click();
  await expect(page.getByText(/Hist.*rico do Caixa/)).toBeVisible();
  await expect(page.getByText('+ R$ 25.00').first()).toBeVisible();
  await expect(page.getByText('- R$ 150.00').first()).toBeVisible();
  await page.waitForTimeout(pause());
});
