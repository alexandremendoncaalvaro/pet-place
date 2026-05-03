import { expect, Locator, Page, test } from '@playwright/test';
import { join } from 'node:path';
import { createPetPlaceState, expectImageLoaded, installPetPlaceApiMock } from '../e2e/support/pet-place-fixture';

const mediaDir = join(process.cwd(), 'tests', 'fixtures', 'media');
const pauseMs = () => test.info().project.name.includes('tutorial') ? 700 : 0;

test.setTimeout(90_000);

test.beforeEach(async ({ page }) => {
  const state = createPetPlaceState({ anonymized: true });
  await installPetPlaceApiMock(page, state);
  await page.goto('/');
  await installTutorialOverlay(page);
  await expect(page.getByRole('heading', { name: /Tutor Azul/ }).first()).toBeVisible();
  await caption(page, 'Pet Place: exemplos com dados ficticios para documentacao.');
});

test('01 - tutorial post com imagem e mencao de pessoa', async ({ page }) => {
  await test.step('abrir nova publicacao', async () => {
    await caption(page, 'Vamos criar uma publicacao com imagem e marcar uma pessoa.');
    await tap(page, page.getByRole('button', { name: /Nova publica/ }));
  });

  await test.step('digitar texto e selecionar mencao', async () => {
    await caption(page, 'Ao digitar @, o app sugere pessoas e pets da comunidade.');
    await typeSlowly(page.getByPlaceholder(/O que/), 'Foto do encontro de hoje com @Tu');
    const personSuggestion = page.getByRole('button').filter({ hasText: 'Tutor Laranja' }).filter({ hasText: 'Pessoa' });
    await expect(personSuggestion).toBeVisible();
    await caption(page, 'Selecionando a pessoa marcada.');
    await tap(page, personSuggestion);
  });

  await test.step('anexar imagem', async () => {
    await caption(page, 'Agora anexamos uma imagem. A previa precisa carregar antes de postar.');
    await page.getByTestId('post-media-input').setInputFiles(join(mediaDir, 'tutorial-photo.svg'));
    await expectImageLoaded(page.getByAltText('preview'));
  });

  await test.step('publicar e comentar', async () => {
    await caption(page, 'Publicando: o post aparece no feed com a imagem e a marcacao.');
    await page.getByPlaceholder(/O que/).fill('Foto do encontro de hoje com @Tutor Laranja no Pet Place');
    await tap(page, page.getByRole('button', { name: 'Postar' }));
    await expect(page.getByText(/Foto do encontro de hoje/)).toBeVisible();
    await expectImageLoaded(page.getByAltText('Post media').first());

    await caption(page, 'Tambem da para abrir comentarios direto no post.');
    await tap(page, page.locator('button[aria-label*="Coment"]').first());
    await typeSlowly(page.getByPlaceholder(/Adicionar um coment/), 'Comentario de exemplo no tutorial');
    await tap(page, page.locator('button[aria-label*="Enviar"]'));
    await expect(page.getByText('Comentario de exemplo no tutorial')).toBeVisible();
  });
});

test('02 - tutorial post com video e mencao de pet', async ({ page }) => {
  await test.step('abrir post de video', async () => {
    await caption(page, 'Agora o fluxo e parecido, mas com video e marcacao de pet.');
    await tap(page, page.getByRole('button', { name: /Nova publica/ }));
  });

  await test.step('marcar pet pelo arroba', async () => {
    await caption(page, 'Digitando @ com parte do nome do pet, a sugestao aparece no editor.');
    await typeSlowly(page.getByPlaceholder(/O que/), 'Video curto da brincadeira com @Lua');
    const petSuggestion = page.getByRole('button').filter({ hasText: 'Pet Lua' }).filter({ hasText: /Pet de/ });
    await expect(petSuggestion).toBeVisible();
    await tap(page, petSuggestion);
  });

  await test.step('anexar video', async () => {
    await caption(page, 'Anexamos um MP4 curto. O app mostra previa e prepara capa.');
    await page.getByTestId('post-media-input').setInputFiles(join(mediaDir, 'tutorial-video.mp4'));
    await expect(page.locator('video').first()).toBeVisible();
    await expect(page.getByText('tutorial-video.mp4')).toBeVisible();
  });

  await test.step('publicar video', async () => {
    await caption(page, 'Depois de publicar, o feed renderiza o video e a marcacao do pet.');
    await page.getByPlaceholder(/O que/).fill('Video curto da brincadeira com @Pet Lua no Pet Place');
    await tap(page, page.getByRole('button', { name: 'Postar' }));
    await expect(page.getByText(/Video curto da brincadeira/)).toBeVisible();
    await expect(page.getByRole('button', { name: '@Pet Lua' }).first()).toBeVisible();
    await expect(page.locator('video').first()).toBeVisible();
  });
});

test('03 - tutorial pagamento externo e transparencia', async ({ page }) => {
  await test.step('abrir area administrativa', async () => {
    await caption(page, 'Administradores podem registrar pagamentos recebidos fora do app.');
    await tap(page, page.getByRole('button', { name: 'Admin' }));
    await tap(page, page.getByRole('button', { name: /Pessoas/ }));
    await expect(page.getByText(/Pagamento externo/)).toBeVisible();
  });

  await test.step('preencher pagamento externo', async () => {
    await caption(page, 'O registro cria uma pessoa offline e anexa o comprovante para transparencia.');
    await tap(page, page.getByRole('button', { name: /Pagamento externo/ }));
    await typeSlowly(page.getByPlaceholder('Nome da pessoa'), 'Tutor Rosa');
    await typeSlowly(page.getByPlaceholder('(47) 99999-9999'), '(47) 95555-4444');
    await typeSlowly(page.getByPlaceholder('Nome do pet (opcional)'), 'Pet Vento');
    await page.locator('input[type="month"]').fill('2026-05');
    await page.locator('input[type="number"]').first().fill('25');
    await page.getByTestId('manual-payment-proof-input').setInputFiles(join(mediaDir, 'tutorial-photo.svg'));
  });

  await test.step('registrar e conferir extrato', async () => {
    await caption(page, 'Ao registrar, o caixa ganha uma entrada confirmada.');
    await tap(page, page.getByRole('button', { name: /Registrar no caixa/ }));
    await expect(page.getByText(/Pessoa e comprovante registrados/)).toBeVisible();

    await caption(page, 'No extrato, a comunidade ve entradas e saidas no mesmo periodo.');
    await tap(page, page.getByRole('button', { name: 'Extrato' }));
    await expect(page.getByText(/Hist.*rico do Caixa/)).toBeVisible();
    await expect(page.getByText('+ R$ 25.00').first()).toBeVisible();
    await expect(page.getByText('- R$ 150.00').first()).toBeVisible();
  });
});

async function installTutorialOverlay(page: Page) {
  await page.addStyleTag({
    content: `
      [data-tutorial-caption] {
        position: fixed;
        left: 18px;
        right: 18px;
        top: 78px;
        z-index: 9999;
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(17, 24, 39, 0.92);
        color: white;
        font: 600 14px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.28);
        pointer-events: none;
      }
    `,
  });
  await page.evaluate(() => {
    const existing = document.querySelector('[data-tutorial-caption]');
    if (existing) return;
    const caption = document.createElement('div');
    caption.setAttribute('data-tutorial-caption', '');
    document.body.appendChild(caption);
  });
}

async function caption(page: Page, text: string) {
  await page.evaluate((value) => {
    const target = document.querySelector('[data-tutorial-caption]');
    if (target) target.textContent = value;
  }, text);
  await page.waitForTimeout(pauseMs());
}

async function tap(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
  await page.waitForTimeout(250);
  await locator.click();
  await page.waitForTimeout(450);
}

async function typeSlowly(locator: Locator, value: string) {
  await locator.click();
  await locator.pressSequentially(value, { delay: 35 });
}
