const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate solid orange PNG with chicken emoji using sharp
const sharp = require('sharp');

async function generateIcons() {
  for (const size of sizes) {
    // Create an orange rounded-rect SVG with chicken emoji
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.2)}" fill="#f97316"/>
      <text x="${size / 2}" y="${Math.round(size * 0.68)}" font-size="${Math.round(size * 0.6)}" text-anchor="middle" dominant-baseline="middle">🐔</text>
    </svg>`;

    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, `icon-${size}.png`));

    console.log(`✅ Generated icon-${size}.png`);
  }
}

generateIcons().catch(console.error);