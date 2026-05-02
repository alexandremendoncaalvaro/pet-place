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
    expect(readme).toContain('assets/pet-place.jpeg');
    expect(readme).toContain('docs/DESIGN_SYSTEM.md');
    expect(readme).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
  });
});
