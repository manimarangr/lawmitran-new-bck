import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DocReviewStatus,
  DocumentStatus,
  VerificationStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { NotifyService } from '../../common/notify/notify.service';
import { RazorpayService } from '../../common/payments/razorpay.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { assertFeature, DOC_FLAGS } from './feature-flags';

type Decision = 'APPROVED' | 'REJECTED' | 'REVISION';

/**
 * Tier-3 lawyer review workflow: client pays a review fee, an APPROVED lawyer
 * claims and decides, and an approval records the lawyer's payout share.
 * Admin-gated by DOCS_LAWYER_REVIEW_ENABLED.
 */
@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private settings: SettingsService,
    private notify: NotifyService,
    private audit: AuditService,
  ) {}

  private async event(
    documentId: string,
    actorId: string,
    action: string,
    comment?: string,
  ) {
    await this.prisma.documentReviewEvent.create({
      data: { documentId, actorId, action, comment: comment ?? null },
    });
  }

  private async assertApprovedLawyer(userId: string): Promise<void> {
    const lawyer = await this.prisma.lawyer.findUnique({
      where: { userId },
      select: { verificationStatus: true },
    });
    if (!lawyer || lawyer.verificationStatus !== VerificationStatus.APPROVED) {
      throw new ForbiddenException(
        'Only verified lawyers can review documents',
      );
    }
  }

  // ---------------- client ----------------

  /** Client: open a Razorpay order for the review fee on a paid document. */
  async requestReview(userId: string, id: string) {
    await assertFeature(
      this.settings,
      DOC_FLAGS.LAWYER_REVIEW,
      'Lawyer review',
    );
    const doc = await this.prisma.customerDocument.findFirst({
      where: { id, userId },
      include: { template: { select: { title: true } } },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.status === DocumentStatus.DRAFT || !doc.contentHtml) {
      throw new BadRequestException(
        'Pay for the document before requesting a review',
      );
    }
    if (doc.reviewStatus !== DocReviewStatus.NONE) {
      throw new BadRequestException(
        'A review has already been requested for this document',
      );
    }

    const fee = await this.settings.getNumber('DOCS_LAWYER_REVIEW_FEE', 499);
    const order = await this.razorpay.createOrder(
      Math.round(fee * 100),
      `rev_${doc.id.slice(0, 26)}`,
    );
    await this.prisma.customerDocument.update({
      where: { id: doc.id },
      data: { reviewFee: fee, reviewOrderId: order.id },
    });
    return {
      customerDocumentId: doc.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      reviewFee: fee,
      razorpayKeyId: (await this.razorpay.getKeyId()) ?? null,
      title: doc.template.title,
    };
  }

  /** Client: confirm the review-fee payment; enters the review queue. */
  async verifyReviewPayment(
    userId: string,
    id: string,
    dto: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    },
  ) {
    const doc = await this.prisma.customerDocument.findFirst({
      where: { id, userId },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.reviewStatus !== DocReviewStatus.NONE) {
      throw new BadRequestException('This review is already paid');
    }
    if (doc.reviewOrderId !== dto.razorpayOrderId) {
      throw new BadRequestException('Order mismatch');
    }
    const ok = await this.razorpay.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!ok)
      throw new BadRequestException('Payment signature verification failed');

    const updated = await this.prisma.customerDocument.update({
      where: { id: doc.id },
      data: {
        reviewStatus: DocReviewStatus.REQUESTED,
        reviewPaymentId: dto.razorpayPaymentId,
      },
      select: { id: true, reviewStatus: true },
    });
    await this.event(doc.id, userId, 'REQUESTED');
    await this.notify.notifyAdmins('DOCUMENT_REVIEW_REQUESTED', {
      title: 'Document review requested',
      body: `A client requested a lawyer review (${doc.id}).`,
      link: '/admin/documents',
    });
    return updated;
  }

  // ---------------- lawyer ----------------

  /** Lawyer: claimable (REQUESTED) + my in-progress reviews. */
  async queue(lawyerUserId: string) {
    await this.assertApprovedLawyer(lawyerUserId);
    return this.prisma.customerDocument.findMany({
      where: {
        OR: [
          { reviewStatus: DocReviewStatus.REQUESTED },
          { lawyerId: lawyerUserId, reviewStatus: DocReviewStatus.IN_REVIEW },
        ],
      },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        reviewStatus: true,
        reviewFee: true,
        createdAt: true,
        lawyerId: true,
        template: {
          select: { title: true, category: { select: { name: true } } },
        },
      },
    });
  }

  /** Lawyer: claim a requested review. */
  async claim(lawyerUserId: string, id: string) {
    await assertFeature(
      this.settings,
      DOC_FLAGS.LAWYER_REVIEW,
      'Lawyer review',
    );
    await this.assertApprovedLawyer(lawyerUserId);
    const doc = await this.prisma.customerDocument.findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (doc.reviewStatus !== DocReviewStatus.REQUESTED) {
      throw new BadRequestException('This review is not available to claim');
    }
    const updated = await this.prisma.customerDocument.update({
      where: { id },
      data: { lawyerId: lawyerUserId, reviewStatus: DocReviewStatus.IN_REVIEW },
      select: { id: true, reviewStatus: true },
    });
    await this.event(id, lawyerUserId, 'CLAIMED');
    return updated;
  }

  /** Lawyer: approve / reject / request revision on a claimed review. */
  async decide(
    lawyerUserId: string,
    id: string,
    decision: Decision,
    comment?: string,
  ) {
    await assertFeature(
      this.settings,
      DOC_FLAGS.LAWYER_REVIEW,
      'Lawyer review',
    );
    const doc = await this.prisma.customerDocument.findUnique({
      where: { id },
    });
    if (!doc) throw new NotFoundException('Document not found');
    if (
      doc.lawyerId !== lawyerUserId ||
      doc.reviewStatus !== DocReviewStatus.IN_REVIEW
    ) {
      throw new ForbiddenException('You are not reviewing this document');
    }
    if (decision !== 'APPROVED' && !comment?.trim()) {
      throw new BadRequestException(
        'A comment is required to reject or request changes',
      );
    }

    if (decision === 'APPROVED') {
      const pct = await this.settings.getNumber(
        'DOCS_LAWYER_PAYOUT_PERCENT',
        70,
      );
      const fee = doc.reviewFee ? Number(doc.reviewFee) : 0;
      const payout = Math.round((fee * pct) / 100);
      await this.prisma.customerDocument.update({
        where: { id },
        data: { reviewStatus: DocReviewStatus.APPROVED, lawyerPayout: payout },
      });
      await this.event(id, lawyerUserId, 'APPROVED', comment);
      await this.notify.notifyUser(doc.userId, 'DOCUMENT_REVIEW_APPROVED', {
        title: 'Your document was approved',
        body: 'A lawyer has reviewed and approved your document.',
      });
      return {
        id,
        reviewStatus: DocReviewStatus.APPROVED,
        lawyerPayout: payout,
      };
    }

    if (decision === 'REJECTED') {
      await this.prisma.customerDocument.update({
        where: { id },
        data: { reviewStatus: DocReviewStatus.REJECTED },
      });
      await this.event(id, lawyerUserId, 'REJECTED', comment);
      await this.notify.notifyUser(doc.userId, 'DOCUMENT_REVIEW_REJECTED', {
        title: 'Your document review',
        body: 'A lawyer could not approve your document. See the reviewer notes.',
      });
      // Refund of the review fee is handled by the admin refund flow (Phase 2).
      return { id, reviewStatus: DocReviewStatus.REJECTED };
    }

    // REVISION - keep IN_REVIEW, ask the client to make changes.
    await this.event(id, lawyerUserId, 'REVISION', comment);
    await this.notify.notifyUser(doc.userId, 'DOCUMENT_REVIEW_CHANGES', {
      title: 'Changes requested on your document',
      body: 'The reviewing lawyer requested changes. See the notes.',
    });
    return { id, reviewStatus: DocReviewStatus.IN_REVIEW };
  }

  /** Buyer/lawyer: the review timeline for a document. */
  async timeline(id: string) {
    return this.prisma.documentReviewEvent.findMany({
      where: { documentId: id },
      orderBy: { createdAt: 'asc' },
      select: { action: true, comment: true, createdAt: true },
    });
  }
}
