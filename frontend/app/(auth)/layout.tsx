import Icon from '@/components/ui/Icon';
import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

/**
 * Auth layout: full site header + footer, light background, and a two-column
 * shell — benefits panel on the left (desktop), form card on the right.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="hero-light flex flex-1 flex-col">

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-6xl items-center justify-center gap-16">
          {/* info panel (desktop) — why sign up, next to the form like CaseBench */}
          <aside className="hidden max-w-md lg:block">
            <h1 className="text-3xl font-extrabold leading-tight text-navy">
              Legal help for every Indian,
              <br />
              <span className="text-gold">simplified.</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              One account for finding verified lawyers, creating legal documents, and tracking your
              requirements.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-2.5">
                <Icon name="circle-check" aria-hidden="true" className="mt-0.5 text-gold" />
                <span><b className="text-navy">Bar Council–verified</b> lawyers across India</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="circle-check" aria-hidden="true" className="mt-0.5 text-gold" />
                <span><b className="text-navy">Ready legal documents</b> with guided forms &amp; live preview</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="circle-check" aria-hidden="true" className="mt-0.5 text-gold" />
                <span><b className="text-navy">Free &amp; confidential</b> — submit a requirement, lawyers contact you</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon name="circle-check" aria-hidden="true" className="mt-0.5 text-gold" />
                <span><b className="text-navy">Plain-English guides</b> to your rights and processes</span>
              </li>
            </ul>
          </aside>

          {/* form card */}
          <div className="w-full max-w-lg">
            <div className="rounded-2xl border border-line bg-white p-8 shadow-[0_18px_50px_rgba(11,25,44,.10)]">
              {children}
            </div>
          </div>
        </div>

      </main>
      </div>
      <SiteFooter />
    </div>
  );
}
