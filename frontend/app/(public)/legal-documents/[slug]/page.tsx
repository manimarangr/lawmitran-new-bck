import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import DocumentWizard from '@/components/documents/DocumentWizard';
import { fetchDocTemplate } from '@/lib/api/documents';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

/** youtube.com/watch?v=ID, youtu.be/ID, or shorts/ID -> privacy-enhanced embed URL. */
function youTubeEmbed(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/,
  );
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await fetchDocTemplate(slug);
  if (!t) return { title: 'Document not found' };
  return {
    title: `${t.title} — Online Template | LawMitran`,
    description: `Create a ${t.title} online in minutes: guided form, instant preview, download after payment. ₹${Number(t.price).toLocaleString('en-IN')}.`,
    alternates: { canonical: `${SITE_URL}/legal-documents/${t.slug}` },
  };
}

export default async function DocumentTemplatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await fetchDocTemplate(slug);
  if (!t) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: t.title,
    description: `Ready-to-use ${t.title} template with a guided form.`,
    offers: { '@type': 'Offer', price: Number(t.price), priceCurrency: 'INR' },
  };
  const embedUrl = t.videoUrl ? youTubeEmbed(t.videoUrl) : null;
  const videoLd = t.videoUrl
    ? {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: `How to create a ${t.title} on LawMitran`,
        description: `Step-by-step walkthrough of creating a ${t.title} using the guided form.`,
        contentUrl: t.videoUrl,
        ...(embedUrl ? { embedUrl } : {}),
        uploadDate: new Date().toISOString().slice(0, 10),
      }
    : null;

  return (
    <main id="main">
      <header className="hero-light py-10">
        <div className="mx-auto max-w-7xl px-6">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-slate-400">
            <Link href="/" className="hover:text-gold">Home</Link> <span className="mx-1">/</span>
            <Link href="/legal-documents" className="hover:text-gold">Legal Documents</Link> <span className="mx-1">/</span>
            {t.title}
          </nav>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy md:text-3xl">{t.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {t.category.name} · ₹{Number(t.price).toLocaleString('en-IN')} · Fill the guided form,
            preview free, pay to download.
          </p>
          {t.requiresStamp && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Icon name="file-shield" aria-hidden="true" />
              Stamp paper required{t.stampBasis ? ` — ${t.stampBasis.toLowerCase()}` : ''}. You&apos;ll
              receive the draft; e-stamping is done separately per your state&apos;s rules.
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {t.videoUrl && (
          <section aria-label="How-to video" className="mx-auto mb-8 max-w-3xl">
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-navy">
              <Icon name="circle-info" aria-hidden="true" className="mr-1 text-gold" />
              How it works — quick video guide
            </h2>
            {embedUrl ? (
              <div className="overflow-hidden rounded-2xl border border-gray-200/60 shadow-sm">
                <iframe
                  src={embedUrl}
                  title={`How to create a ${t.title}`}
                  className="aspect-video w-full"
                  allow="accelerometer; encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            ) : (
              <a
                href={t.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-navy hover:border-gold"
              >
                <Icon name="up-right-from-square" aria-hidden="true" className="text-gold" />
                Watch the walkthrough video
              </a>
            )}
          </section>
        )}
        <DocumentWizard template={t} />
        <p className="mt-8 text-[11px] leading-relaxed text-slate-400">
          This is a self-help template for common situations — it is not legal advice and LawMitran
          is not a law firm. For anything unusual,{' '}
          <Link href="/lawyers" className="font-semibold text-gold hover:underline">talk to a verified lawyer</Link>.
        </p>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {videoLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoLd) }} />
      )}
    </main>
  );
}
