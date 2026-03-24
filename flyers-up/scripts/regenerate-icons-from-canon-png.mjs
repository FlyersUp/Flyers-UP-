#!/usr/bin/env node
/**
 * Regenerate app + PWA icons from a canonical master PNG.
 * - Square sources (e.g. 1024×1024): optional Gemini-corner patch, then resize.
 * - Wide sources: vertical center crop (VERTICAL_FRAC), then patch, then resize.
 * Output: RGB PNG (no alpha).
 *
 * Usage:
 *   Place master at public/icons/canon-icon-source.png (gitignored), then:
 *     node scripts/regenerate-icons-from-canon-png.mjs
 *   Or pass an explicit path:
 *     node scripts/regenerate-icons-from-canon-png.mjs path/to/source.png
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/** Wide-asset only: fraction of source height to keep (center crop). */
const VERTICAL_FRAC = 0.58;

const canonInRepo = path.join(root, 'public/icons/canon-icon-source.png');
const src = process.argv[2] || canonInRepo;

/**
 * Cover faint Gemini watermark in bottom-right by compositing resized wood sampled from above.
 */
async function patchGeminiCorner(input) {
  const meta = await sharp(input).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) throw new Error('Invalid image dimensions');

  const zoneW = Math.round(W * 0.16);
  const zoneH = Math.round(H * 0.13);
  const destLeft = W - zoneW - Math.round(W * 0.012);
  const destTop = H - zoneH - Math.round(H * 0.012);

  const srcLeft = Math.max(0, destLeft - Math.round(W * 0.09));
  const srcTop = Math.max(0, destTop - Math.round(H * 0.2));
  const srcW = Math.min(W - srcLeft, zoneW + Math.round(W * 0.06));
  const srcH = Math.min(Math.max(1, destTop - srcTop), zoneH + Math.round(H * 0.08));

  const patch = await sharp(input)
    .extract({ left: srcLeft, top: srcTop, width: srcW, height: srcH })
    .resize(zoneW, zoneH, { fit: 'fill' })
    .png()
    .toBuffer();

  return sharp(input).composite([{ input: patch, left: destLeft, top: destTop }]);
}

async function basePipeline() {
  if (!fs.existsSync(src)) {
    console.error(
      'Icon source not found:\n  ' +
        src +
        '\n\nEither copy your master PNG to public/icons/canon-icon-source.png (gitignored)\n' +
        'or pass the path:\n  node scripts/regenerate-icons-from-canon-png.mjs path/to/source.png'
    );
    process.exit(1);
  }
  const m = await sharp(src).metadata();
  const h = m.height ?? 0;
  const w = m.width ?? 0;

  let pipeline;
  if (w === h) {
    pipeline = sharp(src).removeAlpha();
  } else {
    const nh = Math.round(h * VERTICAL_FRAC);
    const top = Math.round((h - nh) / 2);
    pipeline = sharp(src).extract({ left: 0, top, width: w, height: nh }).removeAlpha();
  }

  const afterCrop = await pipeline.png().toBuffer();
  const patched = await patchGeminiCorner(afterCrop);
  return patched.removeAlpha();
}

async function writePng(img, outRel) {
  const out = path.join(root, outRel);
  await img.png({ compressionLevel: 9 }).toFile(out);
  console.log('Wrote', out);
}

async function main() {
  const base = await basePipeline();

  await writePng(await base.clone().resize(1024, 1024, { fit: 'cover', position: 'centre' }), 'public/icons/icon-1024.png');
  await writePng(await base.clone().resize(512, 512, { fit: 'cover', position: 'centre' }), 'public/icons/icon-512.png');
  await writePng(await base.clone().resize(192, 192, { fit: 'cover', position: 'centre' }), 'public/icons/icon-192.png');
  await writePng(await base.clone().resize(180, 180, { fit: 'cover', position: 'centre' }), 'public/icons/icon-180.png');
  await writePng(await base.clone().resize(167, 167, { fit: 'cover', position: 'centre' }), 'public/icons/icon-167.png');
  await writePng(await base.clone().resize(512, 512, { fit: 'cover', position: 'centre' }), 'public/icons/maskable-512.png');
  await writePng(await base.clone().resize(1024, 1024, { fit: 'cover', position: 'centre' }), 'public/icons/icon-flyers-source.png');
  await writePng(await base.clone().resize(1024, 1024, { fit: 'cover', position: 'centre' }), 'app/icon.png');
  await writePng(await base.clone().resize(180, 180, { fit: 'cover', position: 'centre' }), 'app/apple-icon.png');

  const meta = await sharp(path.join(root, 'public/icons/icon-1024.png')).metadata();
  console.log('icon-1024.png:', meta.width, '×', meta.height, 'channels:', meta.channels, 'hasAlpha:', meta.hasAlpha);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
