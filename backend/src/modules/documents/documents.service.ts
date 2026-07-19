import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, Prisma, TemplateStatus } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { NotifyService } from '../../common/notify/notify.service';
import { RazorpayService } from '../../common/payments/razorpay.service';
import { paginate, resolvePagination } from '../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';
import { renderTemplate } from '../../common/templates/template-engine';
import { SettingsService } from '../settings/settings.service';
import { complete } from '../ai-intake/llm.client';
import { assertFeature, DOC_FLAGS } from './feature-flags';
import { PdfService } from '../../common/pdf/pdf.service';
import { StampDutyService } from './stamp-duty.service';

export interface TemplateField {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'date' | 'number' | 'select' | 'toggle' | 'checkbox' | 'state';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
}

const PREVIEW_CHARS = 1600; // enough to feel like a real draft, never the full document

// Conditional template engine ({{var}}, {{#if}}, {{#eq}}) — see common/templates.
function renderBody(body: string, input: Record<string, unknown>): string {
  return renderTemplate(body, input, { escapeHtml: true });
}

function fieldsOf(schemaJson: unknown): TemplateField[] {
  const s = schemaJson as { fields?: TemplateField[] } | null;
  return Array.isArray(s?.fields) ? s.fields : [];
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private notify: NotifyService,
    private audit: AuditService,
    private settings: SettingsService,
    private pdf: PdfService,
    private stampDuty: StampDutyService,
  ) {}

  // ================= public =================

  /** Public: document categories with published-template counts. */
  async listCategories() {
    const categories = await this.prisma.documentCategory.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { templates: { where: { status: TemplateStatus.PUBLISHED } } },
        },
      },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      templateCount: c._count.templates,
    }));
  }

  /** Public: published templates, optionally filtered by category slug. */
  async listTemplates(categorySlug?: string) {
    return this.prisma.documentTemplate.findMany({
      where: {
        status: TemplateStatus.PUBLISHED,
        ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        keywords: true,
        price: true,
        language: true,
        requiresStamp: true,
        stampBasis: true,
        category: { select: { name: true, slug: true } },
      },
    });
  }

  /** Public: one published template by id or slug (guided-form schema, no body). */
  async getTemplate(idOrSlug: string) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        status: TemplateStatus.PUBLISHED,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: {
        id: true,
        title: true,
        slug: true,
        keywords: true,
        price: true,
        language: true,
        version: true,
        requiresStamp: true,
        stampBasis: true,
        videoUrl: true,
        schemaJson: true,
        category: { select: { name: true, slug: true } },
      },
    });
    if (!template) throw new NotFoundException('Document template not found');
    return template;
  }

  /** Public: watermarked partial preview — never the full document. */
  async preview(idOrSlug: string, input: Record<string, unknown>) {
    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        status: TemplateStatus.PUBLISHED,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: { bodyTemplate: true, title: true },
    });
    if (!template) throw new NotFoundException('Document template not found');
    const full = renderTemplate(template.bodyTemplate, input ?? {}, {
      escapeHtml: false,
    });
    // HTML variant for the live preview: filled values bold, blanks dotted.
    const fullHtml = renderTemplate(template.bodyTemplate, input ?? {}, {
      escapeHtml: true,
      wrapValue: (v) => `<strong>${v}</strong>`,
      wrapBlank: () =>
        '<span class="doc-blank">\u2026\u2026\u2026\u2026\u2026\u2026</span>',
    });
    const truncated = full.length > PREVIEW_CHARS;
    return {
      title: template.title,
      previewText: truncated ? `${full.slice(0, PREVIEW_CHARS)}…` : full,
      previewHtml: truncated ? `${fullHtml.slice(0, PREVIEW_CHARS * 2)}…` : fullHtml,
      truncated,
    };
  }

  /**
   * AI prefill (docs/12): extract guided-form values from the user's own words.
   * Settings-gated; extraction only — unknown fields stay empty. Returns {} on any failure.
   */
  async prefill(idOrSlug: string, context: string): Promise<{ values: Record<string, string> }> {
    if (!(await this.settings.getBool('AI_ENABLED', false))) return { values: {} };
    const apiKey = await this.settings.get('AI_API_KEY');
    if (!apiKey) return { values: {} };

    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        status: TemplateStatus.PUBLISHED,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: { schemaJson: true, title: true },
    });
    if (!template) throw new NotFoundException('Document template not found');
    const fields = fieldsOf(template.schemaJson);
    if (fields.length === 0) return { values: {} };

    const raw = await complete(
      {
        provider: (await this.settings.get('AI_PROVIDER')) || 'openai',
        apiKey,
        model: (await this.settings.get('AI_MODEL')) || '',
      },
      'You extract form values from a user\u2019s description for a legal document. Fill ONLY ' +
        'fields whose values are explicitly stated in the text — never guess, never invent names, ' +
        'dates, or amounts. Reply as JSON: {"fieldName": "value"} using the given field names. ' +
        'Omit fields you cannot fill. Dates as YYYY-MM-DD.',
      `Document: ${template.title}\nFields:\n${fields
        .map((f) => `- ${f.name} (${f.label}${f.type ? `, ${f.type}` : ''})`)
        .join('\n')}\n\nUser description: ${context.slice(0, 800)}`,
    );
    if (!raw) return { values: {} };
    try {
      const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)) as Record<
        string,
        unknown
      >;
      const allowed = new Set(fields.map((f) => f.name));
      const values: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (allowed.has(k) && typeof v === 'string' && v.trim() && v.length < 300) {
          values[k] = v.trim();
        }
      }
      return { values };
    } catch {
      return { values: {} };
    }
  }

  /** Price quote including any stamp duty for the chosen state. */
  async quote(
    idOrSlug: string,
    opts: { state?: string; declaredValue?: number },
  ) {
    await assertFeature(this.settings, DOC_FLAGS.MARKETPLACE, 'Document marketplace', true);
    const template = await this.prisma.documentTemplate.findFirst({
      where: {
        status: TemplateStatus.PUBLISHED,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      select: { title: true, price: true, requiresStamp: true, stampBasis: true },
    });
    if (!template) throw new NotFoundException('Document template not found');

    const base = Number(template.price);
    const d = await this.stampDuty.computeForTemplate(template, opts);
    const total = base + d.duty;
    const breakdown: { label: string; amount: number }[] = [
      { label: template.title, amount: base },
    ];
    if (d.duty > 0) {
      breakdown.push({
        label: `Stamp duty${opts.state ? ` (${opts.state.toUpperCase()})` : ''}`,
        amount: d.duty,
      });
    }
    return {
      base,
      stampDuty: d.duty,
      total,
      currency: 'INR',
      requiresStamp: template.requiresStamp,
      stampNote: d.note ?? null,
      breakdown,
    };
  }

  // ================= buyer =================

  private validateInput(schemaJson: unknown, input: Record<string, unknown>) {
    for (const f of fieldsOf(schemaJson)) {
      // Checkbox clauses are opt-in by nature — only required when explicit.
      const required =
        f.type === 'checkbox' ? f.required === true : f.required !== false;
      const v = input?.[f.name];
      if (required && (v === undefined || v === null || String(v).trim() === '')) {
        throw new BadRequestException(`Please fill "${f.label}"`);
      }
    }
  }

  /** Start checkout: stores the draft + answers and opens a Razorpay order. */
  async checkout(
    userId: string,
    templateId: string,
    input: Record<string, unknown>,
    opts: { state?: string; declaredValue?: number } = {},
  ) {
    await assertFeature(this.settings, DOC_FLAGS.MARKETPLACE, 'Document marketplace', true);
    const template = await this.prisma.documentTemplate.findFirst({
      where: { id: templateId, status: TemplateStatus.PUBLISHED },
    });
    if (!template) throw new NotFoundException('Document template not found');
    this.validateInput(template.schemaJson, input);

    const duty = (await this.stampDuty.computeForTemplate(template, opts)).duty;
    const total = Number(template.price) + duty;
    const amountPaise = Math.round(total * 100);
    const doc = await this.prisma.customerDocument.create({
      data: {
        userId,
        templateId: template.id,
        inputJson: (input ?? {}) as Prisma.InputJsonValue,
        amount: total,
        stampDuty: duty > 0 ? duty : null,
        status: DocumentStatus.DRAFT,
      },
    });
    const order = await this.razorpay.createOrder(amountPaise, `doc_${doc.id.slice(0, 30)}`);
    await this.prisma.customerDocument.update({
      where: { id: doc.id },
      data: { providerOrderId: order.id },
    });
    return {
      customerDocumentId: doc.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      stampDuty: duty,
      razorpayKeyId: (await this.razorpay.getKeyId()) ?? null,
      title: template.title,
    };
  }

  /** Verify payment, freeze the document content, unlock the download. */
  async verifyPayment(
    userId: string,
    dto: {
      customerDocumentId: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const doc = await this.prisma.customerDocument.findFirst({
      where: { id: dto.customerDocumentId, userId },
      include: { template: true, user: { select: { email: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status !== DocumentStatus.DRAFT) {
      throw new BadRequestException('This document is already paid');
    }
    if (doc.providerOrderId !== dto.razorpayOrderId) {
      throw new BadRequestException('Order mismatch');
    }
    const verified = await this.razorpay.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!verified) {
      throw new BadRequestException('Payment signature verification failed');
    }

    const contentHtml = renderBody(
      doc.template.bodyTemplate,
      (doc.inputJson ?? {}) as Record<string, unknown>,
    );
    const updated = await this.prisma.customerDocument.update({
      where: { id: doc.id },
      data: {
        status: DocumentStatus.PAID,
        contentHtml,
        paymentId: dto.razorpayPaymentId,
      },
      select: { id: true, status: true },
    });

    await this.notify.notifyAdmins('DOCUMENT_PURCHASED', {
      title: `Document purchased: ${doc.template.title}`,
      body: `${doc.user.email} — ₹${doc.amount}`,
      link: '/admin/documents',
    });
    await this.notify.notifyUser(userId, 'DOCUMENT_READY', {
      title: 'Your document is ready',
      body: `${doc.template.title} is ready to view and print from My Documents.`,
    });

    // PDF generation is admin-gated (DOCS_PDF_ENABLED, default off). A failure
    // here never fails the payment - the document stays PAID and can be
    // (re)generated on download.
    if (await this.settings.getBool(DOC_FLAGS.PDF, false)) {
      try {
        const { key } = await this.pdf.generate({
          id: doc.id,
          userId,
          title: doc.template.title,
          contentHtml,
          version: doc.template.version,
        });
        await this.prisma.customerDocument.update({
          where: { id: doc.id },
          data: { pdfUrl: key, status: DocumentStatus.GENERATED },
        });
      } catch (err) {
        this.logger.warn(`PDF generation failed for ${doc.id}: ${(err as Error).message}`);
      }
    }

    return updated;
  }

  /** Buyer: my purchased/draft documents. */
  async myDocuments(userId: string) {
    return this.prisma.customerDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        amount: true,
        createdAt: true,
        template: { select: { title: true, slug: true, requiresStamp: true, stampBasis: true } },
      },
    });
  }

  /** Buyer: one document — content only after payment. */
  async myDocument(userId: string, id: string) {
    const doc = await this.prisma.customerDocument.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        amount: true,
        createdAt: true,
        contentHtml: true,
        inputJson: true,
        template: { select: { title: true, slug: true, requiresStamp: true, stampBasis: true } },
      },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === DocumentStatus.DRAFT) {
      return { ...doc, contentHtml: null };
    }
    return doc;
  }

  /** Buyer: stream the document PDF (generate on demand if missing). */
  async getPdf(userId: string, id: string): Promise<{ buffer: Buffer; filename: string }> {
    await assertFeature(this.settings, DOC_FLAGS.PDF, 'PDF downloads');
    const doc = await this.prisma.customerDocument.findFirst({
      where: { id, userId },
      include: { template: { select: { title: true, version: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === DocumentStatus.DRAFT || !doc.contentHtml) {
      throw new BadRequestException('This document is not paid yet');
    }
    let key = doc.pdfUrl;
    if (!key) {
      const gen = await this.pdf.generate({
        id: doc.id,
        userId,
        title: doc.template.title,
        contentHtml: doc.contentHtml,
        version: doc.template.version,
      });
      key = gen.key;
      await this.prisma.customerDocument.update({
        where: { id: doc.id },
        data: { pdfUrl: key, status: DocumentStatus.GENERATED },
      });
    }
    const buffer = await this.pdf.fetchBytes(key);
    const filename = `${doc.template.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
    return { buffer, filename };
  }

  /** Public: authenticity check - recomputes the content hash. No content is returned. */
  async verifyDocument(id: string) {
    const doc = await this.prisma.customerDocument.findFirst({
      where: { id },
      select: {
        status: true,
        createdAt: true,
        contentHtml: true,
        template: { select: { title: true } },
      },
    });
    if (!doc || doc.status === DocumentStatus.DRAFT || !doc.contentHtml) {
      return { valid: false as const };
    }
    return {
      valid: true as const,
      title: doc.template.title,
      generatedAt: doc.createdAt,
      contentHash: this.pdf.hashContent(doc.contentHtml),
    };
  }

  // ================= admin =================

  async adminListCategories() {
    const categories = await this.prisma.documentCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { templates: true } } },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      templateCount: c._count.templates,
    }));
  }

  private slugify(v: string) {
    return v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async adminCreateCategory(dto: { name: string; description?: string }) {
    const category = await this.prisma.documentCategory.create({
      data: {
        name: dto.name,
        slug: this.slugify(dto.name),
        description: dto.description ?? null,
      },
    });
    await this.audit.log('DOC_CATEGORY_CREATED', {
      entityType: 'DocumentCategory',
      entityId: category.id,
      summary: `Created document category "${dto.name}"`,
    });
    return category;
  }

  async adminUpdateCategory(id: string, dto: { name?: string; description?: string }) {
    const category = await this.prisma.documentCategory.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name, slug: this.slugify(dto.name) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
      },
    });
    await this.audit.log('DOC_CATEGORY_UPDATED', {
      entityType: 'DocumentCategory',
      entityId: id,
      summary: `Updated document category "${category.name}"`,
    });
    return category;
  }

  async adminListTemplates() {
    return this.prisma.documentTemplate.findMany({
      orderBy: [{ status: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        price: true,
        status: true,
        version: true,
        language: true,
        requiresStamp: true,
        updatedAt: true,
        category: { select: { id: true, name: true } },
        _count: { select: { documents: { where: { status: { not: DocumentStatus.DRAFT } } } } },
      },
    });
  }

  async adminGetTemplate(id: string) {
    const template = await this.prisma.documentTemplate.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async adminCreateTemplate(dto: {
    categoryId: string;
    title: string;
    price: number;
    keywords?: string[];
    language?: string;
    requiresStamp?: boolean;
    stampBasis?: string;
    videoUrl?: string;
    schemaJson: unknown;
    bodyTemplate: string;
  }) {
    const template = await this.prisma.documentTemplate.create({
      data: {
        categoryId: dto.categoryId,
        title: dto.title,
        slug: `${this.slugify(dto.title)}-${Date.now().toString(36).slice(-4)}`,
        price: dto.price,
        keywords: dto.keywords ?? [],
        language: dto.language ?? 'en',
        requiresStamp: dto.requiresStamp ?? false,
        stampBasis: dto.stampBasis ?? null,
        videoUrl: dto.videoUrl ?? null,
        schemaJson: (dto.schemaJson ?? { fields: [] }) as Prisma.InputJsonValue,
        bodyTemplate: dto.bodyTemplate,
        status: TemplateStatus.DRAFT,
      },
    });
    await this.audit.log('DOC_TEMPLATE_CREATED', {
      entityType: 'DocumentTemplate',
      entityId: template.id,
      summary: `Created template "${dto.title}" (draft, ₹${dto.price})`,
    });
    return template;
  }

  async adminUpdateTemplate(
    id: string,
    dto: Partial<{
      categoryId: string;
      title: string;
      price: number;
      keywords: string[];
      language: string;
      requiresStamp: boolean;
      stampBasis: string | null;
      videoUrl: string | null;
      schemaJson: unknown;
      bodyTemplate: string;
    }>,
  ) {
    const existing = await this.prisma.documentTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');

    // Editing the content of a published template bumps the version —
    // already-purchased documents keep their frozen contentHtml snapshot.
    const contentChanged =
      (dto.bodyTemplate !== undefined && dto.bodyTemplate !== existing.bodyTemplate) ||
      (dto.schemaJson !== undefined &&
        JSON.stringify(dto.schemaJson) !== JSON.stringify(existing.schemaJson));
    const bumpVersion = contentChanged && existing.status === TemplateStatus.PUBLISHED;

    const template = await this.prisma.documentTemplate.update({
      where: { id },
      data: {
        ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.keywords ? { keywords: dto.keywords } : {}),
        ...(dto.language ? { language: dto.language } : {}),
        ...(dto.requiresStamp !== undefined ? { requiresStamp: dto.requiresStamp } : {}),
        ...(dto.stampBasis !== undefined ? { stampBasis: dto.stampBasis } : {}),
        ...(dto.videoUrl !== undefined ? { videoUrl: dto.videoUrl } : {}),
        ...(dto.schemaJson !== undefined
          ? { schemaJson: dto.schemaJson as Prisma.InputJsonValue }
          : {}),
        ...(dto.bodyTemplate !== undefined ? { bodyTemplate: dto.bodyTemplate } : {}),
        ...(bumpVersion ? { version: { increment: 1 } } : {}),
      },
    });
    await this.audit.log('DOC_TEMPLATE_UPDATED', {
      entityType: 'DocumentTemplate',
      entityId: id,
      summary: `Updated template "${template.title}"${bumpVersion ? ` → v${template.version}` : ''}${dto.price !== undefined ? ` (price ₹${dto.price})` : ''}`,
      ...(dto.price !== undefined
        ? { oldValue: { price: String(existing.price) }, newValue: { price: String(dto.price) } }
        : {}),
    });
    return template;
  }

  async adminSetTemplateStatus(id: string, status: TemplateStatus) {
    const existing = await this.prisma.documentTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    const template = await this.prisma.documentTemplate.update({
      where: { id },
      data: { status, active: status === TemplateStatus.PUBLISHED },
    });
    await this.audit.log(`DOC_TEMPLATE_${status}`, {
      entityType: 'DocumentTemplate',
      entityId: id,
      summary: `"${existing.title}": ${existing.status} → ${status}`,
      oldValue: { status: existing.status },
      newValue: { status },
    });
    return template;
  }

  async adminListOrders(page?: string | number, pageSize?: string | number) {
    const pg = resolvePagination(page, pageSize);
    const where = { status: { not: DocumentStatus.DRAFT } };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.customerDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pg.skip,
        take: pg.take,
        select: {
          id: true,
          status: true,
          amount: true,
          createdAt: true,
          paymentId: true,
          user: { select: { email: true, fullName: true } },
          template: { select: { title: true } },
        },
      }),
      this.prisma.customerDocument.count({ where }),
    ]);
    return paginate(items, total, pg.page, pg.pageSize);
  }

  // ---- admin: stamp-duty rates (OPS) ----

  adminListStampDuty() {
    return this.stampDuty.adminList();
  }

  adminUpsertStampDuty(dto: {
    state: string;
    documentType: string;
    calcType: string;
    flatAmount?: number;
    percent?: number;
    minAmount?: number;
    active?: boolean;
  }) {
    return this.stampDuty.adminUpsert(dto);
  }

  adminUpdateStampDuty(
    id: string,
    dto: Partial<{
      calcType: string;
      flatAmount: number | null;
      percent: number | null;
      minAmount: number | null;
      active: boolean;
    }>,
  ) {
    return this.stampDuty.adminUpdate(id, dto);
  }
}
