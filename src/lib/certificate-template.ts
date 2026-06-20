import { CertificateTemplateLayout, TemplateElement } from './certificate-service';

export interface RenderOptions {
  layout: CertificateTemplateLayout;
  placeholders: Record<string, string>;
  logo_urls?: Record<string, string>;
  signature_urls?: Record<string, string>;
  qr_code_url?: string;
  watermark_id?: string;
  output_type: 'pdf' | 'png';
}

function replacePlaceholders(text: string, placeholders: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  return result;
}

function renderElement(element: TemplateElement, placeholders: Record<string, string>, images: Record<string, string>): string {
  if (element.type === 'text') {
    const text = element.placeholder ? replacePlaceholders(element.placeholder, placeholders) : '';
    const style = `
      position: absolute;
      left: ${element.x}%;
      top: ${element.y}%;
      width: ${element.width || 400}px;
      height: ${element.height || 60}px;
      font-size: ${element.font_size || 24}px;
      font-family: ${element.font_family || 'Georgia'}, serif;
      color: ${element.color || '#1a1a2e'};
      text-align: ${element.align || 'center'};
      display: flex;
      align-items: center;
      justify-content: ${element.align || 'center'};
      line-height: 1.2;
    `;
    return `<div style="${style}">${text}</div>`;
  }

  if (element.type === 'image') {
    const url = element.url && images[element.url] ? images[element.url] : element.url || '';
    if (!url) return '';
    const style = `
      position: absolute;
      left: ${element.x}%;
      top: ${element.y}%;
      width: ${element.width || 100}px;
      height: ${element.height || 60}px;
      object-fit: ${element.position || 'contain'};
    `;
    return `<img src="${url}" style="${style}" />`;
  }

  if (element.type === 'qr') {
    const url = images['qr'] || '';
    if (!url) return '';
    const size = element.size || 80;
    const style = `
      position: absolute;
      left: ${element.x}%;
      top: ${element.y}%;
      width: ${size}px;
      height: ${size}px;
    `;
    return `<img src="${url}" style="${style}" />`;
  }

  return '';
}

export function renderCertificateHTML(options: RenderOptions): string {
  const { layout, placeholders, logo_urls = {}, signature_urls = {}, qr_code_url, watermark_id, output_type } = options;

  const images: Record<string, string> = {
    ...logo_urls,
    ...signature_urls,
    qr: qr_code_url || '',
  };

  const elementsHTML = layout.elements.map(el => renderElement(el, placeholders, images)).join('\n');

  const watermarkHTML = watermark_id ? `
    <div style="
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 14px;
      color: rgba(0,0,0,0.03);
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
      z-index: 1;
    ">${watermark_id}</div>
  ` : '';

  const isLandscape = layout.orientation === 'landscape';
  const width = isLandscape ? '1123px' : '794px';
  const height = isLandscape ? '794px' : '1123px';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width};
      height: ${height};
      overflow: hidden;
      font-family: 'Georgia', serif;
    }
    .certificate {
      width: ${width};
      height: ${height};
      position: relative;
      background: ${layout.background?.url ? `url('${layout.background.url}')` : '#fff'};
      background-size: ${layout.background?.position || 'cover'};
      background-position: center;
    }
  </style>
</head>
<body>
  <div class="certificate">
    ${watermarkHTML}
    ${elementsHTML}
  </div>
</body>
</html>`;
}

export async function renderCertificatePDF(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer-core');
  const browser = await puppeteer.default.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function renderCertificatePNG(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer-core');
  const browser = await puppeteer.default.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1123, height: 794 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

export function generateCertificatePreviewHTML(
  layout: CertificateTemplateLayout,
  placeholders: Record<string, string>
): string {
  return renderCertificateHTML({
    layout,
    placeholders,
    output_type: 'pdf',
  });
}
