// Leonida Trophy Guide — entrypoint for gta6-trophy-guide-01 (Node 22, stdlib only).
//
// The guide itself is app/: plain static files (index.html, style.css, app.js and
// data/trophies.json) that a browser opens offline with no build step and no network
// requests. This program hands it in: it copies app/ and screenshots/ from beside
// this file into the output directory and writes dossier.json there, using the
// vendored make.fun library (vendor/makefun-frontend.ts, left untouched — the scorer
// requires dossier.json to be byte for byte what its own copy writes).
//
// Run locally with:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader the output directory is /output (or MAKEFUN_OUTPUT_DIR).
// Serve the app while developing with:  node serve.ts   (http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's gate: at most 4 screenshots of 256 KiB each, at most
// 993 files / 48 MiB under app/, and the dossier text capped at 160 KiB. The
// dossier is refused outright if app/ or screenshots/ is past its limits.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
