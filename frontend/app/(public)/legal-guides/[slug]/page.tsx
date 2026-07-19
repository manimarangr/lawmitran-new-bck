import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import {
  getGuideView,
  allGuideSlugs,
  GUIDE_DISCLAIMER,
  GUIDE_AUTHOR,
} from '@/lib/legal-guides/source';
import { getCategory } from '@/lib/legal-guides/categories';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.lawmitran.com';

export async function generateStaticParams() {
  const slugs = await allGuideSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGuideView(slug);
  if (!g) return {};
  const url = `${SITE_URL}/legal-guides/${g.slug}`;
  return {
    title: g.seoTitle,
    description: g.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: g.seoTitle, description: g.metaDescription, url, type: 'article' },
  };
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 flex items-baseline gap-2 text-lg font-bold text-navy">
        <span className="text-sm font-extrabold text-gold">{n}.</span> {title}
      </h2>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-600">
          <Icon name="circle-check" aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const g = await getGuideView(slug);
  if (!g) notFound();

  const url = `${SITE_URL}/legal-guides/${g.slug}`;
  const catName = getCategory(g.category)?.name ?? g.category;
  const reviewed = g.reviewState === 'LEGALLY_REVIEWED';

  const articleLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.metaDescription,
    datePublished: g.published,
    dateModified: g.updated,
    inLanguage: 'en-IN',
    mainEntityOfPage: url,
    author: { '@type': 'Person', name: GUIDE_AUTHOR.name, url: `${SITE_URL}${GUIDE_AUTHOR.url}` },
    publisher: {
      '@type': 'Organization',
      name: 'LawMitran',
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.svg` },
    },
  };
  // Only claim an editorial reviewer in structured data once a real advocate
  // has actually reviewed the piece — never imply a review that hasn't happened.
  if (reviewed) {
    articleLd.editor = {
      '@type': 'Person',
      name: g.reviewer.name,
      jobTitle: g.reviewer.designation ?? 'Advocate',
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Legal Guides', item: `${SITE_URL}/legal-guides` },
      { '@type': 'ListItem', position: 3, name: catName, item: `${SITE_URL}/legal-guides/category/${g.category}` },
      { '@type': 'ListItem', position: 4, name: g.title, item: url },
    ],
  };
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: g.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div>
      <article className="mx-auto max-w-4xl px-6 py-10">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-400">
          <Link href="/" className="hover:text-gold">Home</Link> /{' '}
          <Link href="/legal-guides" className="hover:text-gold">Legal Guides</Link> /{' '}
          <Link href={`/legal-guides/category/${g.category}`} className="hover:text-gold">
            {catName}
          </Link>
        </nav>

        <Link
          href={`/legal-guides/category/${g.category}`}
          className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-gold hover:underline"
        >
          {catName}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-navy md:text-3xl">{g.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
          <span>
            By <span className="font-semibold text-slate-500">{GUIDE_AUTHOR.name}</span>
          </span>
          <span aria-hidden="true">·</span>
          {reviewed ? (
            <span>
              Reviewed by{' '}
              <span className="font-semibold text-slate-500">
                {g.reviewer.name}
                {g.reviewer.designation ? `, ${g.reviewer.designation}` : ''}
              </span>
            </span>
          ) : (
            <span>
              Review status:{' '}
              <span className="font-semibold text-slate-500">Pending Legal Review</span>
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span>Published {g.published}</span>
          <span aria-hidden="true">·</span>
          <span>Updated {g.updated}</span>
          <span aria-hidden="true">·</span>
          <span>{g.readMins} min read</span>
        </div>

        <Section n={1} title="Introduction">
          <p className="text-sm leading-relaxed text-slate-600">{g.intro}</p>
        </Section>

        <Section n={2} title="Who should read this?">
          <Bullets items={g.whoShouldRead} />
        </Section>

        <Section n={3} title="What the law says">
          <Bullets items={g.whatLawSays} />
        </Section>

        <Section n={4} title="Step-by-step process">
          <ol className="space-y-3">
            {g.steps.map((s, i) => (
              <li key={i} className="rounded-xl border border-line bg-white p-4">
                <p className="text-sm font-bold text-navy">
                  <span className="mr-2 text-gold">Step {i + 1}</span>
                  {s.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">{s.detail}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section n={5} title="Documents required">
          <Bullets items={g.documents} />
        </Section>

        <Section n={6} title="Fees and government charges">
          <Bullets items={g.fees} />
          <p className="mt-2 text-xs italic text-slate-400">
            Fees vary by state and change over time; treat these as general pointers, not exact
            figures.
          </p>
        </Section>

        <Section n={7} title="Expected timeline">
          <p className="text-sm leading-relaxed text-slate-600">{g.timeline}</p>
        </Section>

        <Section n={8} title="Common mistakes to avoid">
          <Bullets items={g.mistakes} />
        </Section>

        <Section n={9} title="Frequently asked questions">
          <div className="space-y-4">
            {g.faqs.map((f, i) => (
              <div key={i}>
                <p className="text-sm font-bold text-navy">{f.q}</p>
                <p className="mt-1 text-sm text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section n={10} title="When you should consult a lawyer">
          <Bullets items={g.whenConsult} />
        </Section>

        <Section n={11} title="How LawMitran can help">
          <div className="rounded-2xl bg-navy px-6 py-7 text-center text-white">
            <p className="text-base font-bold">Get advice for your specific situation</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-200">
              Submit your legal issue on LawMitran and we will connect you with a verified lawyer who
              can review the facts and guide you on the right next step.
            </p>
            <Link
              href="/lawyers"
              className="mt-5 inline-block rounded-xl bg-gold px-6 py-3 text-sm font-bold text-navy hover:opacity-90"
            >
              Connect with a verified lawyer
            </Link>
          </div>
        </Section>

        {g.related.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Related on LawMitran
            </h2>
            <ul className="space-y-2">
              {g.related.map((r, i) => (
                <li key={i}>
                  <Link href={r.href} className="text-sm font-semibold text-gold hover:underline">
                    {r.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 rounded-xl border border-line bg-bg-soft px-4 py-3 text-xs italic text-slate-500">
          <Icon name="shield-halved" aria-hidden="true" className="mr-1 text-gold" />
          {GUIDE_DISCLAIMER}
        </p>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
    </div>
  );
}
