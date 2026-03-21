#!/usr/bin/env node
/**
 * Generate maskable-512.png from the flyer icon with solid background.
 * - Canvas: 512x512
 * - Background: #FAF9F6 (cream paper), no transparency
 * - Safe zone: icon scaled to fit ~410px center
 * Run: node scripts/generate-maskable-icon.js
 */
const path = require("path");

const SOURCE = path.join(__dirname, "../public/icons/icon-flyers-source.png");
const OUT_PATH = path.join(__dirname, "../public/icons/maskable-512.png");
const CANVAS = 512;
const SAFE_ZONE = 410;
const BG = { r: 250, g: 249, b: 246 }; // #FAF9F6

async function main() {
  const sharp = require("sharp");
  const fs = require("fs");

  if (!fs.existsSync(SOURCE)) {
    console.error("Source not found:", SOURCE);
    process.exit(1);
  }

  const icon = sharp(SOURCE);
  const meta = await icon.metadata();
  const size = Math.min(meta.width, meta.height, SAFE_ZONE);

  const resizedIcon = await icon
    .resize(size, size)
    .png()
    .toBuffer();

  const top = Math.round((CANVAS - size) / 2);
  const left = Math.round((CANVAS - size) / 2);

  await sharp({
    create: {
      width: CANVAS,
      height: CANVAS,
      channels: 4,
      background: { ...BG, alpha: 1 },
    },
  })
    .composite([{ input: resizedIcon, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(OUT_PATH);

  console.log("Created:", OUT_PATH);
  console.log("Size: 512x512, background: #FAF9F6, safe zone: 410px");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
