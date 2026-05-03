import { expect, Locator, Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPetPlaceState, expectImageLoaded, installPetPlaceApiMock } from '../e2e/support/pet-place-fixture';

type TutorialSegment = { text: string; pauseMs?: number };
type TutorialStory = { id: string; title: string; segments: TutorialSegment[] };

const mediaDir = join(process.cwd(), 'tests', 'fixtures', 'media');
const tutorialStories = JSON.parse(readFileSync(join(process.cwd(), 'tools', 'e2e', 'tutorial-narration.json'), 'utf8')) as TutorialStory[];
const pauseMs = () => test.info().project.name.includes('tutorial') ? 550 : 0;

test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  const state = createPetPlaceState();
  await installPetPlaceApiMock(page, state);
  await page.goto('/');
  await installTutorialOverlay(page);
  await expect(page.getByRole('heading', { name: /Tutor Azul/ }).first()).toBeVisible();
});

test('01 - tutorial post com imagem e mencao de pessoa', async ({ page }) => {
  const story = getStory('01-post-com-imagem');

  await stepCaption(page, story, 0);
  await tap(page, page.getByRole('button', { name: /Nova publica/ }));

  await stepCaption(page, story, 1);
  await typeSlowly(page.getByPlaceholder(/O que/), 'Encontro tranquilo no Pet Place com @Tu');
  const personSuggestion = page.getByRole('button').filter({ hasText: 'Tutor Laranja' }).filter({ hasText: 'Pessoa' });
  await expect(personSuggestion).toBeVisible();

  await stepCaption(page, story, 2);
  await tap(page, personSuggestion);

  await stepCaption(page, story, 3);
  await page.getByTestId('post-media-input').setInputFiles(join(mediaDir, 'tutorial-photo.svg'));
  await expectImageLoaded(page.getByAltText('preview'));

  await stepCaption(page, story, 4);
  await page.getByPlaceholder(/O que/).fill('Encontro tranquilo no Pet Place com @Tutor Laranja');
  await tap(page, page.getByRole('button', { name: 'Postar' }));
  await expect(page.getByText(/Encontro tranquilo/)).toBeVisible();
  await expectImageLoaded(page.getByAltText('Post media').first());

  await stepCaption(page, story, 5);
  await tap(page, page.locator('button[aria-label*="Coment"]').first());
  await typeSlowly(page.getByPlaceholder(/Adicionar um coment/), 'Comentario ficticio para o tutorial');
  await tap(page, page.locator('button[aria-label*="Enviar"]'));
  await expect(page.getByText('Comentario ficticio para o tutorial')).toBeVisible();
});

test('02 - tutorial post com video e mencao de pet', async ({ page }) => {
  const story = getStory('02-post-com-video');

  await stepCaption(page, story, 0);
  await tap(page, page.getByRole('button', { name: /Nova publica/ }));

  await stepCaption(page, story, 1);
  await typeSlowly(page.getByPlaceholder(/O que/), 'Video curto da brincadeira com @Lua');
  const petSuggestion = page.getByRole('button').filter({ hasText: 'Pet Lua' }).filter({ hasText: /Pet de/ });
  await expect(petSuggestion).toBeVisible();

  await stepCaption(page, story, 2);
  await tap(page, petSuggestion);

  await stepCaption(page, story, 3);
  await page.getByTestId('post-media-input').setInputFiles(join(mediaDir, 'tutorial-video.mp4'));
  await expect(page.locator('video').first()).toBeVisible();
  await expect(page.getByText('tutorial-video.mp4')).toBeVisible();

  await stepCaption(page, story, 4);
  await page.getByPlaceholder(/O que/).fill('Video curto da brincadeira com @Pet Lua no Pet Place');
  await tap(page, page.getByRole('button', { name: 'Postar' }));
  await expect(page.getByText(/Video curto da brincadeira/)).toBeVisible();
  await expect(page.getByRole('button', { name: '@Pet Lua' }).first()).toBeVisible();
  await expect(page.locator('video').first()).toBeVisible();
});

test('03 - tutorial pagamento externo e transparencia', async ({ page }) => {
  const story = getStory('03-pagamento-e-transparencia');

  await stepCaption(page, story, 0);
  await tap(page, page.getByRole('button', { name: 'Admin' }));
  await tap(page, page.getByRole('button', { name: /Pessoas/ }));
  await expect(page.getByText(/Pagamento externo/)).toBeVisible();

  await stepCaption(page, story, 1);
  await tap(page, page.getByRole('button', { name: /Pagamento externo/ }));
  await typeSlowly(page.getByPlaceholder('Nome da pessoa'), 'Tutor Rosa');
  await typeSlowly(page.getByPlaceholder('(47) 99999-9999'), '(47) 95555-4444');
  await typeSlowly(page.getByPlaceholder('Nome do pet (opcional)'), 'Pet Vento');

  await stepCaption(page, story, 2);
  await page.locator('input[type="month"]').fill('2026-05');
  await page.locator('input[type="number"]').first().fill('25');
  await page.getByTestId('manual-payment-proof-input').setInputFiles(join(mediaDir, 'tutorial-photo.svg'));

  await stepCaption(page, story, 3);
  await tap(page, page.getByRole('button', { name: /Registrar no caixa/ }));
  await expect(page.getByText(/Pessoa e comprovante registrados/)).toBeVisible();

  await stepCaption(page, story, 4);
  await tap(page, page.getByRole('button', { name: 'Extrato' }));
  await expect(page.getByText(/Hist.*rico do Caixa/)).toBeVisible();
  await expect(page.getByText('+ R$ 25.00').first()).toBeVisible();
  await expect(page.getByText('- R$ 150.00').first()).toBeVisible();
});

function getStory(id: string) {
  const story = tutorialStories.find((item) => item.id === id);
  if (!story) throw new Error(`Missing tutorial story ${id}`);
  return story;
}

async function installTutorialOverlay(page: Page) {
  await page.addStyleTag({
    content: `
      [data-tutorial-caption] {
        position: fixed;
        left: 16px;
        right: 16px;
        bottom: 86px;
        z-index: 9999;
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.94);
        color: white;
        font: 650 14px/1.35 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.32);
        pointer-events: none;
      }
      [data-tutorial-pointer] {
        position: fixed;
        width: 34px;
        height: 34px;
        z-index: 10000;
        border: 3px solid rgba(37, 99, 235, 0.96);
        border-radius: 999px;
        background: rgba(37, 99, 235, 0.16);
        box-shadow: 0 0 0 8px rgba(37, 99, 235, 0.12);
        transform: translate(-50%, -50%) scale(0.88);
        transition: opacity 220ms ease, transform 220ms ease;
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

async function stepCaption(page: Page, story: TutorialStory, index: number) {
  const segment = story.segments[index];
  if (!segment) throw new Error(`Missing segment ${index} in ${story.id}`);
  await page.evaluate((value) => {
    const target = document.querySelector('[data-tutorial-caption]');
    if (target) target.textContent = value;
  }, segment.text);
  await page.waitForTimeout((segment.pauseMs ?? 900) + pauseMs());
}

async function tap(page: Page, locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y, { steps: 10 });
    await showPointer(page, x, y);
  }
  await page.waitForTimeout(280 + pauseMs());
  await locator.click();
  await page.waitForTimeout(520 + pauseMs());
}

async function typeSlowly(locator: Locator, value: string) {
  await locator.click();
  await locator.pressSequentially(value, { delay: 45 });
}

async function showPointer(page: Page, x: number, y: number) {
  await page.evaluate(({ x, y }) => {
    const previous = document.querySelector('[data-tutorial-pointer]');
    previous?.remove();
    const pointer = document.createElement('div');
    pointer.setAttribute('data-tutorial-pointer', '');
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;
    document.body.appendChild(pointer);
    requestAnimationFrame(() => {
      pointer.style.transform = 'translate(-50%, -50%) scale(1)';
    });
    window.setTimeout(() => {
      pointer.style.opacity = '0';
      pointer.style.transform = 'translate(-50%, -50%) scale(1.2)';
    }, 260);
    window.setTimeout(() => pointer.remove(), 560);
  }, { x, y });
}
