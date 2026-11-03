import { build } from 'esbuild';
import { mkdirSync, copyFileSync, readdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// tiny .env loader (no dependency on dotenv being present)
function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync('.env', 'utf8');
    raw.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch { /* no .env */ }
  return env;
}
const env = loadEnv();

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/assets', { recursive: true });

await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2020'],
  jsx: 'automatic',
  format: 'esm',
  outdir: 'dist/assets',
  entryNames: 'app',
  assetNames: 'app',
  loader: { '.css': 'css', '.svg': 'dataurl', '.png': 'dataurl' },
  define: {
    // Define the whole env object: the source reads `import.meta.env?.X`, and a
    // per-key define would not match across the optional-chaining operator.
    'import.meta.env': JSON.stringify({
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL || '',
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY || '',
      VITE_GOOGLE_CLIENT_ID: env.VITE_GOOGLE_CLIENT_ID || '',
    }),
    'process.env.NODE_ENV': '"production"',
  },
  logLevel: 'info',
});

// copy public assets
if (existsSync('public')) {
  for (const f of readdirSync('public')) {
    copyFileSync(join('public', f), join('dist', f));
  }
}

// emit index.html
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SeoSprint — Google-free SEO crawler and audit</title>
    <meta name="description" content="SeoSprint crawls any site itself — no Google account, no API key. Scored technical audits, whole-site crawls, competitor compare, broken-link reports and live rank checks." />
    <meta name="theme-color" content="#070a12" />
    <meta property="og:title" content="SeoSprint — Google-free SEO crawler and audit" />
    <meta property="og:description" content="Audit any site without a Google account. Our own crawler, real SERP checks, honest limits." />
    <meta property="og:type" content="website" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%236d5efc'/%3E%3Cpath d='M9 21l5-6 3.5 4L23 11' stroke='white' stroke-width='2.4' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" />
    <link rel="stylesheet" href="./assets/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./assets/app.js"></script>
  </body>
</html>`;
writeFileSync('dist/index.html', html);
writeFileSync('dist/404.html', html);
writeFileSync('dist/.nojekyll', '');
console.log('built dist/');
