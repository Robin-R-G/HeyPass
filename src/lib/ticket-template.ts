import QRCode from 'qrcode';

export interface TicketRenderData {
  ticket_number: string;
  event_title: string;
  event_date: string;
  event_location: string;
  attendee_name: string;
  attendee_email: string;
  ticket_type: string;
  qr_code_data_url: string;
  organizer_name?: string;
  organizer_logo?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function renderTicketHTML(data: TicketRenderData): string {
  const eventDate = formatDate(data.event_date);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 800px;
      height: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ticket {
      width: 780px;
      height: 300px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 16px;
      display: flex;
      overflow: hidden;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .ticket::before {
      content: '';
      position: absolute;
      left: 540px;
      top: -12px;
      width: 24px;
      height: 24px;
      background: #f0f0f0;
      border-radius: 50%;
    }
    .ticket::after {
      content: '';
      position: absolute;
      left: 540px;
      bottom: -12px;
      width: 24px;
      height: 24px;
      background: #f0f0f0;
      border-radius: 50%;
    }
    .ticket-left {
      flex: 1;
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 2px dashed rgba(255,255,255,0.15);
    }
    .ticket-right {
      width: 220px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #e94560, #c23152);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 14px;
    }
    .brand-name {
      color: rgba(255,255,255,0.9);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .event-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.2;
      margin-top: 4px;
    }
    .event-details {
      display: flex;
      gap: 24px;
    }
    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .detail-label {
      color: rgba(255,255,255,0.4);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .detail-value {
      color: rgba(255,255,255,0.9);
      font-size: 13px;
      font-weight: 500;
    }
    .attendee-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .attendee-name {
      color: #ffffff;
      font-size: 16px;
      font-weight: 600;
    }
    .ticket-number {
      color: rgba(255,255,255,0.5);
      font-size: 11px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      letter-spacing: 1px;
    }
    .ticket-type-badge {
      background: rgba(233, 69, 96, 0.2);
      color: #e94560;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .qr-container {
      background: #ffffff;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .qr-container img {
      width: 130px;
      height: 130px;
    }
    .scan-text {
      color: rgba(255,255,255,0.4);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="ticket-left">
      <div>
        <div class="brand">
          <div class="brand-logo">H</div>
          <div class="brand-name">${escapeHtml(data.organizer_name || 'HeyPass')}</div>
        </div>
        <div class="event-title">${escapeHtml(data.event_title)}</div>
      </div>
      <div class="event-details">
        <div class="detail-item">
          <span class="detail-label">Date</span>
          <span class="detail-value">${escapeHtml(eventDate)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Location</span>
          <span class="detail-value">${escapeHtml(data.event_location)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Type</span>
          <span class="detail-value">${escapeHtml(data.ticket_type)}</span>
        </div>
      </div>
      <div class="attendee-info">
        <div>
          <div class="attendee-name">${escapeHtml(data.attendee_name)}</div>
          <div class="ticket-number">${escapeHtml(data.ticket_number)}</div>
        </div>
        <div class="ticket-type-badge">${escapeHtml(data.ticket_type)}</div>
      </div>
    </div>
    <div class="ticket-right">
      <div class="qr-container">
        <img src="${data.qr_code_data_url}" alt="QR Code" />
      </div>
      <div class="scan-text">Scan at entrance</div>
    </div>
  </div>
</body>
</html>`;
}

export async function renderTicketPNG(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer-core');
  const browser = await puppeteer.default.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 800, height: 320 });
    await page.setContent(html, { waitUntil: 'load' });
    const screenshot = await page.screenshot({ type: 'png', fullPage: false });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}

export async function renderTicketPDF(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer-core');
  const browser = await puppeteer.default.launch({
    executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const pdfBuffer = await page.pdf({
      width: '800px',
      height: '320px',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export async function generateTicketImage(data: TicketRenderData): Promise<{ png: Buffer; pdf: Buffer }> {
  const html = renderTicketHTML(data);
  const [png, pdf] = await Promise.all([
    renderTicketPNG(html),
    renderTicketPDF(html),
  ]);
  return { png, pdf };
}
