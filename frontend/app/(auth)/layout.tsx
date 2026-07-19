import Link from 'next/link';
import Image from 'next/image';
import Icon from '@/components/ui/Icon';

/**
 * Centered auth layout (light theme): logo on top, white card in the middle,
 * trust signals + disclaimer below. Replaces the former navy split-panel.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-light flex min-h-screen flex-col">
      <div className="p-6">
        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-navy">
          <Icon name="arrow-left" className="mr-1" /> Back to home
        </Link>
      </div>

      <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 pb-10">
        <div className="flex w-full max-w-5xl items-center justify-center gap-14">
          {/* info panel (desktop) — why sign up, next to the form like CaseBench */}
          <aside className="hidden max-w-sm lg:block">
            <Link href="/" className="mb-8 inline-flex" aria-label="LawMitran home">
              <Image src="/logo.svg" alt="LawMitran" width={170} height={40} className="h-10 w-auto" priority />
            </Link>
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
          <div className="w-full max-w-md">
            <Link href="/" className="mb-6 flex items-center justify-center lg:hidden" aria-label="LawMitran home">
              <Image src="/logo.svg" alt="LawMitran" width={170} height={40} className="h-10 w-auto" priority />
            </Link>
            <div className="rounded-2xl border border-line bg-white p-8 shadow-[0_18px_50px_rgba(11,25,44,.10)]">
              {children}
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-md text-center text-[11px] text-slate-400">
          © 2026 LawMitran · An information platform, not a law firm. We don&apos;t provide legal advice.
        </p>
      </main>
    </div>
  );
}
