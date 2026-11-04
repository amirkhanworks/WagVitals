const pages = [
  'index.html',
  'product.html',
  'about.html',
  'contact.html',
  'privacy.html',
  'terms.html',
  '404.html'
];

const base = 'https://amirkhanworks.github.io/WagVitals/';
const requests = pages.flatMap(path =>
  Array.from({ length: 5 }, (_, index) => ({ path, index }))
);

(async () => {
  const results = await Promise.all(requests.map(async ({ path, index }) => {
    const started = performance.now();
    const response = await fetch(base + path, {
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(15000)
    });
    const body = await response.text();
    const duration = performance.now() - started;

    if (!response.ok) {
      throw new Error(path + ' request ' + index + ' returned HTTP ' + response.status);
    }
    if (!body.includes('<title') || !body.includes('<h1')) {
      throw new Error(path + ' request ' + index + ' did not return a complete HTML page');
    }

    return { path, duration };
  }));

  const timings = results.map(result => result.duration).sort((a, b) => a - b);
  const p95 = timings[Math.min(timings.length - 1, Math.ceil(timings.length * 0.95) - 1)];
  const average = timings.reduce((sum, value) => sum + value, 0) / timings.length;

  console.log('Burst test passed: ' + results.length + ' successful requests across ' + pages.length + ' pages.');
  console.log('Average response: ' + average.toFixed(0) + ' ms; p95: ' + p95.toFixed(0) + ' ms.');
  if (p95 > 8000) {
    throw new Error('Static page p95 response time exceeded the 8 second QA threshold.');
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
