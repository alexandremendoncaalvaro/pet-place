import { expect, test } from '@playwright/test';
import { createPetPlaceState, expectImageLoaded, installPetPlaceApiMock, PetPlaceE2EState } from './support/pet-place-fixture';

let state: PetPlaceE2EState;

test.beforeEach(async ({ page }) => {
  state = createPetPlaceState();
  await installPetPlaceApiMock(page, state);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Tutor Azul/ })).toBeVisible();
});

test('01 - home mostra mensalidade vigente e feed inicial', async ({ page }) => {
  await expect(page.getByText(/Mensalidade:/)).toBeVisible();
  await expect(page.getByText(/Em dia/)).toBeVisible();
  await expect(page.getByText(/Pet Sol brincando/)).toBeVisible();
  await expectImageLoaded(page.getByAltText('Post media').first());
  await expect(page.getByRole('button', { name: 'Comentários da publicação' })).toContainText('2');
});

test('02 - detalhes da mensalidade exibem historico e comprovante em tela cheia', async ({ page }) => {
  await page.getByRole('button', { name: /Detalhes/ }).click();
  await expect(page.getByText(/Meus Pagamentos/)).toBeVisible();
  await expect(page.getByText(/Historico|Histórico/)).toBeVisible();
  await page.getByRole('button', { name: /Ver Comprovante/ }).first().click();
  await expect(page.getByText(/Comprovante:/)).toBeVisible();
  await expectImageLoaded(page.locator('[class*="fixed"] img').last());
});

test('03 - extrato mostra entradas, saidas e historico do caixa', async ({ page }) => {
  await page.getByText('Extrato').click();
  await expect(page.getByText(/Transpar/)).toBeVisible();
  await expect(page.getByText('Entradas')).toBeVisible();
  await expect(page.getByText('+ R$ 50.00')).toBeVisible();
  await expect(page.getByText('Saídas')).toBeVisible();
  await expect(page.getByText('- R$ 150.00').first()).toBeVisible();
  await expect(page.getByText(/Historico do Caixa|Histórico do Caixa/)).toBeVisible();
});

test('04 - mural lista notificacoes e eventos importantes', async ({ page }) => {
  await page.getByText('Mural').click();
  await expect(page.getByText(/Minhas Notifica/)).toBeVisible();
  await expect(page.getByText(/Comentario no seu post|Comentário no seu post/)).toBeVisible();
  await expect(page.getByText(/Eventos e Avisos/)).toBeVisible();
  await expect(page.getByText(/Mutirao de limpeza|Mutirão de limpeza/)).toBeVisible();
});

test('05 - comunidade permite buscar pessoas e pets', async ({ page }) => {
  await page.getByText('Comunidade').click();
  await page.getByPlaceholder('Buscar...').fill('Tutor Laranja');
  await expect(page.getByText('Tutor Laranja')).toBeVisible();
  await page.getByPlaceholder('Buscar...').fill('Pet Lua');
  await expect(page.getByText('Pet Lua')).toBeVisible();
  await expectImageLoaded(page.getByAltText('Pet Lua').first());
});

test('06 - perfil atualiza telefone no formato brasileiro', async ({ page }) => {
  await page.getByRole('button', { name: 'Meu Perfil' }).click();
  await page.getByPlaceholder('(47) 99999-9999').fill('(47) 98888-7777');
  await page.getByRole('button', { name: /Salvar Perfil/ }).click();
  await expect(page.getByText(/Perfil atualizado/)).toBeVisible();
  expect(state.user?.phone).toBe('47988887777');
});

test('07 - nova publicacao aceita mencao digitada com arroba', async ({ page }) => {
  await page.getByRole('button', { name: /Nova publica/ }).click();
  await page.getByPlaceholder(/O que/).fill('Oi @Tu');
  const linkedSuggestion = page.getByRole('button').filter({ hasText: 'Tutor Laranja' }).filter({ hasText: 'Pessoa' });
  await expect(linkedSuggestion).toBeVisible();
  await linkedSuggestion.click();
  await page.getByPlaceholder(/O que/).fill('Oi @Tutor Laranja, bem-vinda ao Pet Place');
  await page.getByRole('button', { name: 'Postar' }).click();
  await expect(page.getByText(/bem-vinda ao Pet Place/)).toBeVisible();
});

test('08 - curtida atualiza o contador da publicacao', async ({ page }) => {
  const likeButton = page.getByRole('button', { name: 'Curtir publicação' }).first();
  await expect(likeButton).toContainText('1');
  await likeButton.click();
  await expect(page.getByRole('button', { name: 'Remover curtida' }).first()).toContainText('2');
});

test('09 - comentario aparece na thread da publicacao', async ({ page }) => {
  await page.getByRole('button', { name: 'Comentários da publicação' }).first().click();
  await expect(page.getByText(/Tambem vi|Também vi/)).toBeVisible();
  await page.getByPlaceholder(/Adicionar um coment/).fill('Comentario automatizado pelo E2E');
  await page.getByRole('button', { name: /Enviar comentario|Enviar comentário/ }).click();
  await expect(page.getByText('Comentario automatizado pelo E2E')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Comentários da publicação' }).first()).toContainText('3');
});

test('10 - admin registra pagamento externo com comprovante', async ({ page }) => {
  await page.getByRole('button', { name: 'Admin' }).click();
  await page.getByRole('button', { name: /Pessoas/ }).click();
  await page.getByRole('button', { name: /Pagamento externo/ }).click();
  await page.getByPlaceholder('Nome da pessoa').fill('Tutor Rosa');
  await page.getByPlaceholder('(47) 99999-9999').fill('(47) 95555-4444');
  await page.getByPlaceholder('Nome do pet (opcional)').fill('Pet Vento');
  await page.locator('input[type="month"]').fill('2026-05');
  await page.locator('input[type="number"]').first().fill('25');
  await page.getByTestId('manual-payment-proof-input').setInputFiles({
    name: 'comprovante.png',
    mimeType: 'image/png',
    buffer: Buffer.from('fake-image'),
  });
  await page.getByRole('button', { name: /Registrar no caixa/ }).click();
  await expect(page.getByText(/Pessoa e comprovante registrados/)).toBeVisible();
  expect(state.payments.some((payment) => payment.familyId.startsWith('offline-') && payment.amount === 25)).toBe(true);
});

test('11 - nova familia nao apoiadora ve convite e nao recebe mensalidade automatica', async ({ page }) => {
  state.user = state.users.find((user) => user.uid === 'user-resident') || state.user;
  state.supporters = state.supporters.filter((supporter) => supporter.familyId !== 'family-resident');
  state.payments = state.payments.filter((payment) => payment.familyId !== 'family-resident');
  await page.reload();
  await expect(page.getByText(/Seja um apoiador recorrente|Ajude a manter o PetPlace/)).toBeVisible();
  await expect(page.getByText(/Mensalidade:/)).not.toBeVisible();
  expect(state.payments.some((payment) => payment.familyId === 'family-resident' && payment.type === 'mensalidade')).toBe(false);
});

test('12 - perfil permite virar apoiador recorrente e cria mensalidade', async ({ page }) => {
  state.user = state.users.find((user) => user.uid === 'user-resident') || state.user;
  state.supporters = state.supporters.filter((supporter) => supporter.familyId !== 'family-resident');
  state.payments = state.payments.filter((payment) => payment.familyId !== 'family-resident');
  await page.reload();
  await page.getByRole('button', { name: /Virar apoiador/ }).first().click();
  await page.getByRole('button', { name: /Virar apoiador recorrente/ }).click();
  await expect(page.getByText(/Você agora é apoiador recorrente/)).toBeVisible();
  expect(state.supporters.some((supporter) => supporter.familyId === 'family-resident' && supporter.status === 'active')).toBe(true);
  expect(state.payments.some((payment) => payment.familyId === 'family-resident' && payment.type === 'mensalidade' && payment.status === 'pending')).toBe(true);
});

test('13 - pausar apoio pode cancelar mensalidade pendente do mes', async ({ page }) => {
  state.user = state.users.find((user) => user.uid === 'user-resident') || state.user;
  state.payments = state.payments.map((payment) => payment.id === 'payment-resident-may' ? { ...payment, status: 'pending', proofUrl: '' } : payment);
  await page.reload();
  await page.getByRole('button', { name: 'Meu Perfil' }).click();
  await page.getByRole('button', { name: /Pausar apoio recorrente/ }).click();
  await page.getByRole('button', { name: /Cancelar pendência/ }).click();
  await expect(page.getByText(/pendência do mês cancelada/)).toBeVisible();
  expect(state.supporters.find((supporter) => supporter.familyId === 'family-resident')?.status).toBe('paused');
  expect(state.payments.some((payment) => payment.familyId === 'family-resident' && payment.month === '2026-05' && payment.status === 'pending')).toBe(false);
});
