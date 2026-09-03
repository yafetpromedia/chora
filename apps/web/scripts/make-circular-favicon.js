const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

async function circularPng(src, size) {
  const circle = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/>` +
      `</svg>`,
  );
  return sharp(src)
    .resize(size, size, { fit: "cover" })
    .composite([{ input: circle, blend: "dest-in" }])
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
    offset += png.length;
  }
  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function main() {
  const root = path.join(__dirname, "..");
  const src = path.join(root, "public/brand/chora-mark.png");

  const sizes = [16, 32, 48, 64];
  const pngs = [];
  for (const size of sizes) {
    pngs.push(await circularPng(src, size));
  }
  const ico = await pngToIco(pngs);
  fs.writeFileSync(path.join(root, "public/favicon.ico"), ico);
  fs.writeFileSync(path.join(root, "src/app/favicon.ico"), ico);

  fs.writeFileSync(path.join(root, "src/app/icon.png"), await circularPng(src, 32));
  fs.writeFileSync(path.join(root, "src/app/apple-icon.png"), await circularPng(src, 180));
  fs.writeFileSync(
    path.join(root, "public/brand/chora-favicon.png"),
    await circularPng(src, 192),
  );

  console.log("Wrote circular favicon assets");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
