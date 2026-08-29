const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.resolve(__dirname, '..', 'public');
const iconsDir = path.resolve(publicDir, 'icons');
const inputSvg = path.resolve(iconsDir, 'icon.svg');
const maskableSvg = path.resolve(iconsDir, 'icon-maskable.svg');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generatePngIcons() {
  console.log('Generating PNG icons from SVG...');
  for (const size of sizes) {
    const outPath = path.resolve(iconsDir, `icon-${size}x${size}.png`);
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`Created ${outPath}`);
  }

  // Maskable 512
  const maskableOut = path.resolve(iconsDir, 'icon-maskable-512x512.png');
  await sharp(maskableSvg)
    .resize(512, 512)
    .png()
    .toFile(maskableOut);
  console.log(`Created ${maskableOut}`);
}

async function generateFaviconIco() {
  console.log('Generating multi-resolution favicon.ico...');
  const icoSizes = [16, 32, 48];
  const pngBuffers = [];

  for (const s of icoSizes) {
    const buf = await sharp(inputSvg)
      .resize(s, s)
      .png()
      .toBuffer();
    pngBuffers.push({ size: s, buffer: buf });
  }

  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let currentOffset = headerSize + count * dirEntrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type: 1 = ICO
  header.writeUInt16LE(count, 4); // Image count

  const dirEntries = [];
  for (const item of pngBuffers) {
    const dir = Buffer.alloc(dirEntrySize);
    dir.writeUInt8(item.size >= 256 ? 0 : item.size, 0); // Width
    dir.writeUInt8(item.size >= 256 ? 0 : item.size, 1); // Height
    dir.writeUInt8(0, 2); // Color palette
    dir.writeUInt8(0, 3); // Reserved
    dir.writeUInt16LE(1, 4); // Color planes
    dir.writeUInt16LE(32, 6); // Bits per pixel
    dir.writeUInt32LE(item.buffer.length, 8); // Size in bytes
    dir.writeUInt32LE(currentOffset, 12); // Offset
    dirEntries.push(dir);
    currentOffset += item.buffer.length;
  }

  const icoBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map(p => p.buffer),
  ]);

  const faviconPath = path.resolve(publicDir, 'favicon.ico');
  fs.writeFileSync(faviconPath, icoBuffer);
  console.log(`Successfully generated favicon.ico at ${faviconPath} (${icoBuffer.length} bytes)`);
}

async function main() {
  try {
    await generatePngIcons();
    await generateFaviconIco();
    console.log('All icons & favicon generated successfully!');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

main();
