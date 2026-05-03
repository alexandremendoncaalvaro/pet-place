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
    expect(existsSync(join(root, 'docs/DESIGN_SYSTEM.md'))).toBe(true);
    expect(existsSync(join(root, 'docs/MEDIA_POLICY.md'))).toBe(true);
    expect(readme).toContain('assets/pet-place.jpeg');
    expect(readme).toContain('docs/DESIGN_SYSTEM.md');
    expect(readme).toContain('docs/MEDIA_POLICY.md');
    expect(readme).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
