#!/usr/bin/env node
/**
 * Guarantee a compiled frontend exists before `npm start` serves it.
 *
 * Most hosts compile the React app during their build phase, in which case
 * build/index.html already exists and this is a no-op. But if a host skips the
 * build step (or someone runs `npm start` on a fresh checkout), we build once
 * here so the single-process server has a UI to serve instead of API-only.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const indexHtml = path.join(__dirname, '..', 'build', 'index.html');

if (fs.existsSync(indexHtml)) {
  console.log('✓ build/ present — skipping build');
  process.exit(0);
}

console.log('• build/ missing — running `npm run build`…');
execSync('npm run build', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
