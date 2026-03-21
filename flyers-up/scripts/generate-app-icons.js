#!/usr/bin/env node
/**
 * Generate PWA app icons from SVG source.
 * Produces: icon-512.png, icon-192.png (and extra sizes)
 * Maskable icon: run node scripts/generate-maskable-icon.js (uses flyer PNG)
 * Requires: sharp (npm install sharp)
 */
const fs = require("fs");
const path = require("path");

const SOURCE = path.join(__dirname, "../public/icons/app-icon-source.svg");
const OUT_DIR = path.join(__dirname, "../public/icons");

const OUTPUTS = [
  { name: "icon-512.png", size: 512 },
  { name: "icon-192.png", size: 192 },
];

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("sharp not found. Run: npm install sharp");
    process.exit(1);
  }

  if (!fs.existsSync(SOURCE)) {
    console.error("Source SVG not found:", SOURCE);
    process.exit(1);
  }

  const svgBuffer = fs.readFileSync(SOURCE);

  for (const { name, size } of OUTPUTS) {
    const outPath = path.join(OUT_DIR, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log("Created:", outPath);
  }

  // Also generate 1024, 180, 167 for Apple/other use
  const extraSizes = [1024, 180, 167];
  for (const size of extraSizes) {
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log("Created:", outPath);
  }

  console.log("Done. For maskable icon: node scripts/generate-maskable-icon.js");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
