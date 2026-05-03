import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const skippedPathPatterns = [
  /^assets\//,
  /^dist\//,
  /^node_modules\//,
  /^tools\/migrate\/\.venv\//,
  /^tools\/migrate\/uv\.lock$/,
  /^package-lock\.json$/,
];

const binaryExtensions = new Set([
  '.avif',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mp4',
  '.png',
  '.webm',
  '.webp',
  '.zip',
]);

const highConfidencePatterns = [
  { name: 'Cloudflare API token', regex: /\bcfat_[A-Za-z0-9_-]{20,}\b/g },
  { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g },
  { name: 'Google API key', regex: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { name: 'Private key block', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]{40,}-----END [A-Z ]*PRIVATE KEY-----/g },
  { name: 'Firebase service account private key', regex: /"private_key"\s*:\s*"-----BEGIN PRIVATE KEY-----/g },
];

const sensitiveAssignment =
  /\b([A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE_KEY|CLIENT_SECRET|API_KEY|PASSWORD)[A-Z0-9_]*)\s*=\s*["']?([^"'\s#][^"'\r\n#]*)/g;

function listedFiles() {
  const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' });
  return output.split('\0').filter(Boolean).map((file) => file.replaceAll('\\', '/'));
}

function shouldSkip(file) {
  if (skippedPathPatterns.some((pattern) => pattern.test(file))) return true;
  const extension = file.slice(file.lastIndexOf('.')).toLowerCase();
  return binaryExtensions.has(extension);
}

function lineNumberFor(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function redact(value) {
  if (value.length <= 8) return '<redacted>';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isPlaceholder(value) {
  const normalized = value.trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  return (
    normalized === '' ||
    normalized === 'example' ||
    normalized === 'placeholder' ||
    normalized === 'changeme' ||
    normalized === 'replace_me' ||
    normalized === 'your-secret-here' ||
    normalized.includes('change-me') ||
    normalized.startsWith('${{ secrets.') ||
    normalized.includes('example.com')
  );
}

const findings = [];

for (const file of listedFiles()) {
  if (shouldSkip(file)) continue;

  const content = readFileSync(file, 'utf8');
  if (content.includes('\0')) continue;

  for (const pattern of highConfidencePatterns) {
    pattern.regex.lastIndex = 0;
    for (const match of content.matchAll(pattern.regex)) {
      findings.push({
        file,
        line: lineNumberFor(content, match.index ?? 0),
        name: pattern.name,
        value: redact(match[0]),
      });
    }
  }

  sensitiveAssignment.lastIndex = 0;
  for (const match of content.matchAll(sensitiveAssignment)) {
    const [, key, rawValue] = match;
    if (isPlaceholder(rawValue)) continue;
    findings.push({
      file,
      line: lineNumberFor(content, match.index ?? 0),
      name: `Sensitive assignment: ${key}`,
      value: redact(rawValue),
    });
  }
}

if (findings.length > 0) {
  console.error('Potential hard-coded secrets found:');
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.name} (${finding.value})`);
  }
  process.exit(1);
}

console.log('Secret scan passed.');
