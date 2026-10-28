import {REVERSED_LOGO, BLACK_LOGO} from './brand-artwork.mjs?v=unified-e1fe3bc4a6f2';

export const EXPORT_SITE = 'CollegeHockeyData.com';
const LOGO_RATIO = 758 / 142;
let logoPromise;

function logoUrl() {
  // Favicon paths follow each page's depth, including root and women's routes.
  const icon = document.querySelector('link[rel~="icon"]');
  return new URL('chd-horizontal-reversed.png', new URL('.', new URL(icon.getAttribute('href'), document.baseURI))).href;
}

export function prepareExportBranding() {
  if (!logoPromise) {
    logoPromise = (async () => {
      const logo = new Image();
      logo.src = logoUrl();
      await logo.decode();
      return logo;
    })().catch(error => { logoPromise = undefined; throw error; });
  }
  return logoPromise;
}

// Preload on page load; each export also awaits decoding, including the first click.
if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
  prepareExportBranding().catch(() => {});
}

export function exportBrandLayout(width) {
  const band = Math.max(76, Math.round(width * .075));
  const padding = Math.round(width * .04);
  const logoWidth = Math.min(width * .43, band * .66 * LOGO_RATIO);
  return {band, padding, logoWidth, logoHeight: logoWidth / LOGO_RATIO, fontSize: Math.max(18, Math.round(width * .0215))};
}

// Append a separate band so charts, coverage notes, and sources retain their space.
export async function brandExportCanvas(canvas) {
  const logo = await prepareExportBranding();
  const {band, padding, logoWidth, logoHeight, fontSize} = exportBrandLayout(canvas.width);
  const output = document.createElement('canvas');
  output.width = canvas.width;
  output.height = canvas.height + band;
  const context = output.getContext('2d');
  context.drawImage(canvas, 0, 0);
  context.fillStyle = '#18453b';
  context.fillRect(0, canvas.height, output.width, band);
  context.drawImage(logo, padding, canvas.height + (band - logoHeight) / 2, logoWidth, logoHeight);
  context.fillStyle = '#f3f4ed';
  context.font = `700 ${fontSize}px Arial,sans-serif`;
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  context.fillText(EXPORT_SITE, output.width - padding, canvas.height + band / 2, output.width - logoWidth - padding * 3);
  return output;
}

// Inline artwork makes saved SVGs portable without an external font or image.
export function brandExportSVG(markup, width, height, {grayscale = false} = {}) {
  const {band, padding, logoWidth, logoHeight, fontSize} = exportBrandLayout(width);
  const logo = (grayscale ? BLACK_LOGO : REVERSED_LOGO).replace(/<svg\b[^>]*>/,
    `<svg x="${padding}" y="${height + (band - logoHeight) / 2}" width="${logoWidth}" height="${logoHeight}" viewBox="0 0 758 142" color="${grayscale ? '#111111' : '#f3f4ed'}">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + band}" viewBox="0 0 ${width} ${height + band}">${markup}<rect x="0" y="${height}" width="${width}" height="${band}" fill="${grayscale ? '#ffffff' : '#18453b'}"/>${logo}<text x="${width - padding}" y="${height + band / 2}" fill="${grayscale ? '#111111' : '#f3f4ed'}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="end" dominant-baseline="middle">${EXPORT_SITE}</text></svg>`;
}
