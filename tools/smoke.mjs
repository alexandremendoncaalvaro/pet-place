const baseUrl = process.argv[2]?.replace(/\/$/, '');

if (!baseUrl) {
  console.error('Usage: node tools/smoke.mjs <base-url>');
  process.exit(1);
}

async function check(path, validate) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, { redirect: 'manual' });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  const body = await response.text();
  if (validate && !validate(body, response)) {
    throw new Error(`${url} returned unexpected content`);
  }
  console.log(`ok ${url}`);
}

await check('/api/health', (body) => {
  const parsed = JSON.parse(body);
  return parsed.ok === true && parsed.service === 'caixinha-pet-place';
});

await check('/', (body) => body.includes('<div id="root"></div>') && body.includes('/assets/'));

console.log(`Smoke passed for ${baseUrl}`);
