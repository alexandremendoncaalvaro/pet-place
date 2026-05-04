import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), 'utf8');
}

function listFiles(dir: string): string[] {
  const absolute = join(root, dir);
  return readdirSync(absolute).flatMap((entry) => {
    const path = join(absolute, entry);
    const relative = `${dir}/${entry}`.replace(/\\/g, '/');
    return statSync(path).isDirectory() ? listFiles(relative) : [relative];
  });
}

describe('project architecture guardrails', () => {
  it('keeps React components on the shared feedback system instead of native alerts', () => {
    const offenders = listFiles('src/components')
      .filter((file) => file.endsWith('.tsx'))
      .filter((file) => /\balert\s*\(|\b(window|globalThis)\.confirm\s*\(/.test(read(file)));

    expect(offenders).toEqual([]);
  });

  it('keeps feedback above modal surfaces', () => {
    const feedback = read('src/components/Feedback.tsx');

    expect(feedback).toContain('z-[220]');
  });

  it('keeps the dev deployment branch standardized as development', () => {
    const workflow = read('.github/workflows/deploy-dev.yml');

    expect(workflow).toContain('- development');
    expect(workflow).not.toMatch(/^\s*-\s+dev\s*$/m);
    expect(workflow).not.toMatch(/^\s*-\s+develop\s*$/m);
  });

  it('keeps realtime infrastructure declared in Wrangler', () => {
    const wrangler = read('wrangler.toml');

    expect(wrangler).toContain('name = "REALTIME"');
    expect(wrangler).toContain('class_name = "RealtimeHub"');
    expect(wrangler).toContain('new_sqlite_classes = ["RealtimeHub"]');
  });

  it('keeps data subscriptions topic-scoped instead of aggressive polling', () => {
    const apiService = read('src/services/api.ts');
    const subscriptions = read('src/services/subscriptions.ts');

    expect(apiService).not.toContain(', 30000');
    expect(subscriptions).toContain('DEFAULT_REFRESH_INTERVAL_MS = 120000');
    expect(subscriptions).toContain('matchesTopic');
  });

  it('keeps the external payment form compact and mobile-first', () => {
    const adminPanel = read('src/components/AdminPanel.tsx');

    expect(adminPanel).toContain('aria-expanded={isOpen}');
    expect(adminPanel).toContain('Valor recebido (R$)');
    expect(adminPanel).toContain('grid grid-cols-1 gap-3 sm:grid-cols-2');
    expect(adminPanel).not.toContain('grid grid-cols-2 gap-3');
  });

  it('keeps post comment counts available before opening the comment drawer', () => {
    const worker = read('worker/index.ts');
    const postItem = read('src/components/PostItem.tsx');

    expect(worker).toContain('COUNT(DISTINCT pc.id) AS comment_count');
    expect(worker).toContain("commentCount: Number(row.comment_count || 0)");
    expect(worker).toContain("action: 'comment-deleted'");
    expect(postItem).toContain('visibleCommentCount');
  });

  it('keeps mention notifications family-aware for pets', () => {
    const createPostModal = read('src/components/CreatePostModal.tsx');
    const postItem = read('src/components/PostItem.tsx');
    const mentions = read('src/lib/mentions.ts');

    expect(createPostModal).toContain('applyMention');
    expect(createPostModal).toContain('mentionSuggestions');
    expect(createPostModal).toContain("from 'textarea-caret'");
    expect(createPostModal).toContain('mentionMenuPosition');
    expect(createPostModal).toContain('onKeyDown={handleContentKeyDown}');
    expect(createPostModal).toContain('style={{ top: mentionMenuPosition.top, left: mentionMenuPosition.left }}');
    expect(createPostModal).toContain('resolveMentionNotificationTargets(postTags');
    expect(postItem).toContain('resolveMentionNotificationTargets(newTags');
    expect(mentions).toContain('const familyId = owner.familyId || owner.uid');
    expect(mentions).toContain('targetUids.delete(actorUid)');
    expect(createPostModal).not.toContain('taggedPet.familyId');
    expect(postItem).not.toContain('taggedPet.familyId');
  });

  it('cleans duplicate monthly placeholders before merging identity payments', () => {
    const worker = read('worker/index.ts');
    const duplicateCleanup = worker.indexOf("DELETE FROM payments\n        WHERE type = 'mensalidade'");
    const movePayments = worker.indexOf('UPDATE payments SET family_id = ?, updated_at = ? WHERE family_id = ?');

    expect(duplicateCleanup).toBeGreaterThan(-1);
    expect(movePayments).toBeGreaterThan(-1);
    expect(duplicateCleanup).toBeLessThan(movePayments);
  });

  it('keeps financial writes behind positive amount validation', () => {
    const worker = read('worker/index.ts');

    expect(worker).toContain('function positiveAmount');
    expect(worker).toContain('const amount = positiveAmount(form.get(\'amount\'));');
    expect(worker).toContain('const amount = positiveAmount(charge.amount);');
    expect(worker).toContain('const amount = positiveAmount(data.amount);');
  });

  it('backfills recurring supporters without charging new families by default', () => {
    const migration = read('migrations/0008_supporter_subscriptions.sql');
    const worker = read('worker/index.ts');
    const appContext = read('src/context/AppContext.tsx');

    expect(migration).toContain('CREATE TABLE IF NOT EXISTS supporter_subscriptions');
    expect(migration).toContain("WHERE user_status != 'blocked'");
    expect(migration).toContain("WHERE type IS NULL OR type = 'mensalidade'");
    expect(worker).toContain("reason: 'not-supporter'");
    expect(worker).toContain('processMonthlySupporterPayments');
    expect(appContext).toContain('isSupporterActiveForMonth(mySupporter, currentMonth)');
  });

  it('keeps financial media private while preserving the authenticated transparency ledger', () => {
    const worker = read('worker/index.ts');
    const mediaPolicy = read('worker/security.ts');

    expect(worker).toContain('resolveMediaAccessReference');
    expect(worker).toContain('canAccessMediaReference(user, accessReference)');
    expect(worker).toContain('SELECT family_id FROM payments WHERE proof_key = ? LIMIT 1');
    expect(worker).toContain('SELECT id FROM expenses WHERE receipt_key = ? LIMIT 1');
    expect(worker).toContain('SELECT id FROM users WHERE photo_key = ? LIMIT 1');
    expect(worker).toContain('SELECT id FROM posts WHERE media_key = ? LIMIT 1');
    expect(worker).toContain("includeProofs: user.role === 'admin'");
    expect(worker).toContain("includeReceipts: user.role === 'admin'");
    expect(mediaPolicy).toContain("reference.kind === 'payment-proof'");
    expect(mediaPolicy).toContain("reference.kind === 'expense-receipt'");
    expect(mediaPolicy).toContain("reference.kind === 'unknown'");
  });

  it('serves videos with range support and explicit posters', () => {
    const worker = read('worker/index.ts');
    const api = read('src/services/api.ts');
    const postItem = read('src/components/PostItem.tsx');
    const uploads = read('src/services/uploads.ts');
    const createPostModal = read('src/components/CreatePostModal.tsx');

    expect(worker).toContain("request.headers.get('Range')");
    expect(worker).toContain('parseByteRange');
    expect(worker).toContain('env.MEDIA.head');
    expect(worker).toContain('status: 416');
    expect(worker).toContain("headers.set('Accept-Ranges', 'bytes')");
    expect(worker).toContain("headers.set('Content-Range'");
    expect(worker).toContain("headers.set('Content-Disposition', 'inline')");
    expect(worker).toContain('poster_key');
    expect(api).toContain('createVideoPoster');
    expect(uploads).toContain("'image/webp'");
    expect(uploads).toContain('validateVideoForUpload');
    expect(uploads).toContain('classifyUploadMedia');
    expect(uploads).toContain('getUploadMimeType');
    expect(uploads).toContain("VIDEO_EXTENSIONS = new Set(['.m4v', '.mov', '.mp4'])");
    expect(uploads).toContain("'video/quicktime'");
    expect(uploads).toContain('MEDIA_EVENT_TIMEOUT_MS');
    expect(uploads).toContain('Video metadata validation skipped');
    expect(createPostModal).toContain('accept="image/*,video/*,.mp4,.mov,.m4v"');
    expect(createPostModal).toContain('htmlFor="post-media-input"');
    expect(createPostModal).toContain('controls');
    expect(createPostModal).toContain('poster={postVideoPosterUrl || undefined}');
    expect(createPostModal).not.toContain('postFileInputRef.current?.click()');
    expect(createPostModal).not.toContain('video/webm');
    expect(uploads).not.toContain('Tente exportar como MP4 e enviar novamente');
    expect(uploads).toContain("supportedTypes: ['video/mp4', 'video/quicktime', 'video/x-m4v']");
    expect(postItem).toContain('poster={post.posterUrl}');
    expect(postItem).toContain('src={videoSrc}');
    expect(postItem).not.toContain('crossOrigin="use-credentials"');
    expect(postItem).not.toContain('codecs=');
    expect(postItem).toContain('prepareAuthenticatedVideo');
    expect(postItem).toContain("credentials: 'include'");
    expect(postItem).toContain('Preparando vídeo...');
    expect(postItem).toContain('preload="metadata"');
    expect(postItem).toContain('Video blob playback error');
  });

  it('keeps legacy Firebase runtime files out of the public repo root', () => {
    const legacyFiles = [
      'firebase.json',
      'firebase-applet-config.json',
      'firestore.rules',
      'storage.rules',
      'CLOUD_FUNCTIONS.md',
    ];

    expect(legacyFiles.filter((file) => existsSync(join(root, file)))).toEqual([]);
  });

  it('keeps the public README grounded in repo assets and design docs', () => {
    const readme = read('README.md');

    expect(existsSync(join(root, 'assets/pet-place.jpeg'))).toBe(true);
    expect(existsSync(join(root, 'docs/README.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/ARCHITECTURE.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/DEPLOYMENT.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/DESIGN_SYSTEM.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/MEDIA_POLICY.md'))).toBe(true);
    expect(readme).toContain('assets/pet-place.jpeg');
    expect(readme).toContain('docs/README.md');
    expect(readme).toContain('docs/DESIGN_SYSTEM.md');
    expect(readme).toContain('docs/MEDIA_POLICY.md');
    expect(readme).toContain('docs/DEPLOYMENT.md');
    expect(readme).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });

  it('keeps pnpm as the Node package manager', () => {
    const packageJson = JSON.parse(read('package.json')) as { packageManager?: string };
    const ci = read('.github/workflows/ci.yml');

    expect(packageJson.packageManager).toMatch(/^pnpm@/);
    expect(existsSync(join(root, 'pnpm-lock.yaml'))).toBe(true);
    expect(existsSync(join(root, 'package-lock.json'))).toBe(false);
    expect(ci).toContain('pnpm install --frozen-lockfile');
    expect(ci).toContain('cache: pnpm');
  });
});
