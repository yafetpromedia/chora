const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MARK = path.join(ROOT, "apps/web/public/brand/chora-mark.png");

/** Solid teal pad — no transparency (browsers handle this better as favicons). */
async function makeSolidLogo(size) {
  const teal = { r: 15, g: 118, b: 110, alpha: 1 };
  const inset = Math.max(1, Math.round(size * 0.06));
  const inner = Math.max(1, size - inset * 2);
  const logo = await sharp(MARK)
    .resize(inner, inner, { fit: "contain", background: teal })
    .ensureAlpha()
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: teal,
    },
  })
    .composite([{ input: logo, left: inset, top: inset }])
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
  const icoPngs = [];
  for (const s of [16, 32, 48]) icoPngs.push(await makeSolidLogo(s));
  const ico = await pngToIco(icoPngs);

  fs.writeFileSync(path.join(ROOT, "apps/web/public/favicon.ico"), ico);
  fs.writeFileSync(path.join(ROOT, "apps/web/src/app/favicon.ico"), ico);

  // App Router file conventions — larger icons so /icon works in production
  fs.writeFileSync(path.join(ROOT, "apps/web/src/app/icon.png"), await makeSolidLogo(192));
  fs.writeFileSync(path.join(ROOT, "apps/web/src/app/apple-icon.png"), await makeSolidLogo(180));

  const brand512 = await makeSolidLogo(512);
  fs.writeFileSync(path.join(ROOT, "apps/web/public/brand/favicon.png"), brand512);
  fs.writeFileSync(path.join(ROOT, "apps/web/public/brand/chora-favicon.png"), await makeSolidLogo(64));

  console.log("favicon.ico", ico.length);
  console.log("icon.png 192", (await makeSolidLogo(192)).length);
  console.log("done — solid Chora favicons");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
