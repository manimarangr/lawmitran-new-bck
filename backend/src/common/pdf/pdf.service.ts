import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { SettingsService } from '../../modules/settings/settings.service';
import { StorageService } from '../storage/storage.service';

export interface PdfInput {
  id: string;
  userId: string;
  title: string;
  contentHtml: string; // frozen, already HTML-escaped body text (newlines preserved)
  version: number;
}

/** Optionally load a package that may not be installed (puppeteer, qrcode). */
function loadOptional(name: string): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(name);
  } catch {
    return null;
  }
}

/**
 * Renders a paid document's frozen content into a branded, verifiable PDF and
 * stores it in object storage. Engine is admin-switchable via DOCS_PDF_ENGINE
 * (gotenberg | puppeteer); default gotenberg (no in-app Chromium).
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private config: ConfigService,
    private settings: SettingsService,
    private storage: StorageService,
  ) {}

  /** SHA-256 of the frozen content - the tamper-evidence anchor for /verify. */
  hashContent(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
  }

  /** Fetch stored PDF bytes by key (backend-proxied private download). */
  fetchBytes(key: string): Promise<Buffer> {
    return this.storage.getBytes(key);
  }

  async generate(input: PdfInput): Promise<{ key: string; hash: string }> {
    const engine = (await this.settings.get('DOCS_PDF_ENGINE')) || 'gotenberg';
    const origin =
      this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000';
    const verifyUrl = `${origin}/verify/${input.id}`;
    const hash = this.hashContent(input.contentHtml);
    const qr = await this.qrDataUri(verifyUrl);

    const html = this.buildHtml(input, { hash, verifyUrl, qr });
    const footer = this.footerHtml();

    const bytes =
      engine === 'puppeteer'
        ? await this.renderPuppeteer(html, footer)
        : await this.renderGotenberg(html, footer);

    const key = `documents/${input.userId}/${input.id}/v${input.version}/document.pdf`;
    await this.storage.putBytes(key, bytes, 'application/pdf');
    this.logger.log(`Generated PDF for document ${input.id} via ${engine}`);
    return { key, hash };
  }

  // ---------------- rendering ----------------

  private async renderGotenberg(html: string, footer: string): Promise<Buffer> {
    const base = this.config.get<string>('GOTENBERG_URL') ?? 'http://gotenberg:3000';
    const url = `${base}/forms/chromium/convert/html`;
    const g = globalThis as any;
    const form = new g.FormData();
    form.append('files', new g.Blob([html], { type: 'text/html' }), 'index.html');
    form.append('files', new g.Blob([footer], { type: 'text/html' }), 'footer.html');
    form.append('marginTop', '0.6');
    form.append('marginBottom', '0.7');
    form.append('marginLeft', '0.6');
    form.append('marginRight', '0.6');
    form.append('printBackground', 'true');

    const res = await g.fetch(url, { method: 'POST', body: form });
    if (!res.ok) {
      throw new Error(`Gotenberg returned ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  private async renderPuppeteer(html: string, footer: string): Promise<Buffer> {
    const puppeteer = loadOptional('puppeteer');
    if (!puppeteer) {
      throw new Error('puppeteer is not installed; set DOCS_PDF_ENGINE=gotenberg');
    }
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: footer,
        margin: { top: '18mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private async qrDataUri(text: string): Promise<string | null> {
    const QR = loadOptional('qrcode');
    if (!QR) return null;
    try {
      return await QR.toDataURL(text, { margin: 1, width: 96 });
    } catch {
      return null;
    }
  }

  // ---------------- layout ----------------

  private footerHtml(): string {
    return (
      '<div style="font-size:8px;width:100%;padding:0 12mm;color:#888;' +
      'display:flex;justify-content:space-between;">' +
      '<span>LawMitran</span>' +
      '<span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>' +
      '</div>'
    );
  }

  private buildHtml(
    input: PdfInput,
    meta: { hash: string; verifyUrl: string; qr: string | null },
  ): string {
    const shortHash = meta.hash.slice(0, 16);
    const qrImg = meta.qr
      ? `<img src="${meta.qr}" width="88" height="88" alt="Verification QR" />`
      : '';
    const generatedAt = new Date().toISOString().slice(0, 10);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", Georgia, serif; color: #1a2233; font-size: 12pt; line-height: 1.5; margin: 0; }
  .header { border-bottom: 2px solid #0d1b3e; padding-bottom: 8px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: baseline; }
  .brand { font-weight: 700; font-size: 16pt; color: #0d1b3e; letter-spacing: .5px; }
  .docid { font-size: 8pt; color: #888; }
  .doc-body { white-space: pre-wrap; }
  .verify { margin-top: 28px; padding-top: 12px; border-top: 1px solid #ccc; display: flex; gap: 14px; align-items: center; font-size: 8.5pt; color: #444; }
  .verify .meta { line-height: 1.4; }
  .disclaimer { margin-top: 14px; font-size: 7.5pt; color: #999; font-style: italic; }
</style>
</head>
<body>
  <div class="header">
    <span class="brand">LawMitran</span>
    <span class="docid">Document ID: ${input.id}<br/>Generated: ${generatedAt}</span>
  </div>

  <div class="doc-body">${input.contentHtml}</div>

  <div class="verify">
    ${qrImg}
    <div class="meta">
      <strong>Authenticity</strong><br/>
      Verify at: ${meta.verifyUrl}<br/>
      SHA-256: ${shortHash}&hellip;
    </div>
  </div>

  <div class="disclaimer">
    Generated via LawMitran. This document does not guarantee legal enforceability;
    stamping, registration, notarization, and witnessing remain the user's
    responsibility where applicable. Not legal advice.
  </div>
</body>
</html>`;
  }
}
