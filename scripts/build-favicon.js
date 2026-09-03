const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MARK = path.join(ROOT, "apps/web/public/brand/chora-mark.png");

/** Match on-page .brand-mark CSS radius (~22%) — rounded square, not a circle. */
async function roundedSquareMask(size, radiusRatio = 0.22) {
  const r = Math.round(size * radiusRatio);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="white"/>` +
      `</svg>`,
  );
  return sharp(svg).png().toBuffer();
}

async function makeRoundedLogo(size) {
  const src = await sharp(MARK).resize(size, size, { fit: "cover" }).ensureAlpha().png().toBuffer();
  const mask = await roundedSquareMask(size);
  return sharp(src)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function pngToIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  let offset = 6 + 16 * count;
  const entries = [];
  const bodies = [];
  for (const png of pngBuffers) {
    const meta = await sharp(png).metadata();
    const w = meta.width >= 256 ? 0 : meta.width;
    const h = meta.height >= 256 ? 0 : meta.height;
    const entry = Buffer.alloc(16);
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    bodies.push(png);
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...bodies]);
}

(async () => {
  const sizes = [16, 32, 48];
  const pngs = [];
  for (const s of sizes) pngs.push(await makeRoundedLogo(s));

  const ico = await pngToIco(pngs);
  fs.writeFileSync(path.join(ROOT, "apps/web/public/favicon.ico"), ico);
  fs.writeFileSync(path.join(ROOT, "apps/web/src/app/favicon.ico"), ico);

  fs.writeFileSync(path.join(ROOT, "apps/web/src/app/icon.png"), await makeRoundedLogo(32));
  fs.writeFileSync(path.join(ROOT, "apps/web/src/app/apple-icon.png"), await makeRoundedLogo(180));
  fs.writeFileSync(path.join(ROOT, "apps/web/public/brand/favicon.png"), await makeRoundedLogo(512));

  const corner = await sharp(path.join(ROOT, "apps/web/public/brand/favicon.png"))
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });
  console.log("corner rgba (expect alpha 0)", [
    corner.data[0],
    corner.data[1],
    corner.data[2],
    corner.data[3],
  ]);
  console.log("ico bytes", ico.length);
  console.log("done — rounded-square logo favicon (not circle)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
