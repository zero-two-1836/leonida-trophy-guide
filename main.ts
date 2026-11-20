// Leonida Trophy Guide — the handover program for gta6-trophy-guide-01.
//
// The guide itself is the static web app in app/ (open app/index.html in a
// browser; it works fully offline). This program is what hands the entry in:
// it copies app/ and screenshots/ into the output directory and writes the
// dossier the judge reads, using the vendored make.fun library so the bytes
// match the scorer's own build exactly.
//
// Run it the way the grader does, with MAKEFUN_OUTPUT_DIR standing in for
// /output outside the grading container:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Preview the app itself with: node serve.ts  (then http://localhost:8080)

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The app goes in whole: pages, styles, scripts and its data file.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });

// The screenshots ride along under their own folder.
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotsDir = join(repoDir, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier is built with the competition's own caps: source text capped
// at 160 KiB, at most 4 screenshots of at most 256 KiB each, and app/ held to
// 993 entries and 48 MiB. vendor/makefun-frontend.ts is the kit's library,
// used unchanged on purpose — the gate rebuilds the dossier with its own copy
// and compares the two byte for byte.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
