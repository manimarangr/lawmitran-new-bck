import SiteHeader from '@/components/site/SiteHeader';
import SiteFooter from '@/components/site/SiteFooter';

/**
 * Auth layout: header + footer + light background. Each page renders its own
 * AuthShell (aside + form card) since signup pages need role-specific asides
 * that a shared layout can't provide.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="hero-light flex flex-1 flex-col">
        <main id="main" className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          {children}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
