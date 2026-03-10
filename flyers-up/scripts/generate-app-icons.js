#!/usr/bin/env node
/**
 * Generate app icons at required sizes from icon-512.png.
 * Run: node scripts/generate-app-icons.js
 * Requires: sharp (npm install sharp)
 */
const fs = require('fs');
const path = require('path');

const SIZES = [1024, 180, 167];
const SOURCE = path.join(__dirname, '../public/icons/icon-512.png');
const OUT_DIR = path.join(__dirname, '../public/icons');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('sharp not found. Run: npm install sharp');
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE)) {
    console.error('Source not found:', SOURCE);
    process.exit(1);
  }

  for (const size of SIZES) {
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(SOURCE)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log('Created:', outPath);
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
