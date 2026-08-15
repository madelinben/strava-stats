#!/usr/bin/env node
/**
 * Seed local dashboard.json + version.json from the committed sample.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'public', 'data');
const samplePath = join(dataDir, 'dashboard.sample.json');
const dashboardPath = join(dataDir, 'dashboard.json');
const versionPath = join(dataDir, 'version.json');

mkdirSync(dataDir, { recursive: true });
copyFileSync(samplePath, dashboardPath);

const dashboard = JSON.parse(readFileSync(dashboardPath, 'utf8')) as {
  generatedAt?: string;
};
const generatedAt = dashboard.generatedAt ?? new Date().toISOString();
writeFileSync(
  versionPath,
  JSON.stringify({ generatedAt, source: 'seed' }, null, 2) + '\n',
  'utf8',
);

console.log(`Seeded ${dashboardPath}`);
console.log(`Seeded ${versionPath} (${generatedAt})`);
