// Generate PWA icon PNGs from a single SVG source.
//
// Usage: `node scripts/generate-icons.mjs`
//
// We produce two purposes:
//   - "any" (regular icons): rendered with a small inset so the artwork keeps
//      breathing room on the home screen.
//   - "maskable": Android applies a system-defined mask (circle, squircle,
//      rounded square…) and crops up to ~10% off each side. We render the
//      same SVG but on a slightly larger background to keep the wallet
//      inside the documented 80% safe zone.
//
// We intentionally use the local `sharp` install (a devDependency) so the
// project stays self-contained and reproducible.

import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const srcSvg = path.join(root, "public", "icons", "icon.svg");
const outDir = path.join(root, "public", "icons");

const BG = { r: 0x4f, g: 0x46, b: 0xe5, alpha: 1 }; // brand primary

async function generate() {
  const svgBuffer = await fs.readFile(srcSvg);

  // The source viewBox is 512×512 — sharp can rasterize SVG at any density.
  const variants = [
    { name: "icon-192.png", size: 192, padded: true },
    { name: "icon-512.png", size: 512, padded: true },
    // Maskable: slightly smaller artwork on a fully-flooded background so
    // the safe zone (inner 80%) is preserved when Android applies the mask.
    { name: "icon-maskable-192.png", size: 192, padded: false },
    { name: "icon-maskable-512.png", size: 512, padded: false },
    // Apple touch icon (iOS doesn't support maskable, so use the regular).
    { name: "apple-touch-icon.png", size: 180, padded: true },
  ];

  await fs.mkdir(outDir, { recursive: true });

  for (const v of variants) {
    // For maskable, render the SVG at ~80% of the canvas and composite onto
    // a brand-coloured background. For regular, render at 100% — the SVG
    // already includes its own rounded background tile.
    const inner = v.padded ? v.size : Math.round(v.size * 0.8);
    const offset = Math.round((v.size - inner) / 2);

    const rendered = await sharp(svgBuffer, { density: 384 })
      .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const canvas = sharp({
      create: {
        width: v.size,
        height: v.size,
        channels: 4,
        background: v.padded ? { r: 0, g: 0, b: 0, alpha: 0 } : BG,
      },
    });

    await canvas
      .composite([{ input: rendered, top: offset, left: offset }])
      .png({ compressionLevel: 9 })
      .toFile(path.join(outDir, v.name));

    console.log("wrote", v.name, `(${v.size}×${v.size})`);
  }
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
