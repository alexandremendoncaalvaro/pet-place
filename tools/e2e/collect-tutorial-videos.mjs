import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const resultsDir = join(root, 'test-results');
const targetDir = join(root, 'docs', 'tutorials', 'generated');

const titles = [
  ['post-com-imagem', /post-com-imagem|imagem/i],
  ['post-com-video', /post-com-video|video/i],
  ['pagamento-e-transparencia', /pagamento-e-transparencia|transparencia/i],
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });

const videos = walk(resultsDir)
  .filter((path) => path.endsWith('video.webm'))
  .filter((path) => path.includes('tutorial-chromium'))
  .sort();

let copied = 0;
for (const [index, [name, pattern]] of titles.entries()) {
  const source = videos.find((path) => pattern.test(path));
  if (!source) continue;
  const target = join(targetDir, `${String(index + 1).padStart(2, '0')}-${name}.webm`);
  copyFileSync(source, target);
  copied += 1;
  console.log(`copied ${target}`);
}

if (copied === 0) {
  throw new Error('No tutorial videos found. Run npm run test:e2e:tutorial first.');
}
