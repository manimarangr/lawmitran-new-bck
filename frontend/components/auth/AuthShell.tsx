import Container from '@/components/ui/Container';

/**
 * Shared two-column shell for every (auth) page: an info/benefits panel on
 * the left (desktop only) and a form card on the right. Signup pages pass a
 * role-specific aside; login/forgot/reset/verify-otp pass DefaultAuthAside.
 */
export default function AuthShell({
  aside,
  children,
  showAsideOnMobile = true,
}: {
  aside: React.ReactNode;
  children: React.ReactNode;
  /** Login/forgot/reset/verify-otp keep the aside desktop-only, as before. */
  showAsideOnMobile?: boolean;
}) {
  return (
    <Container className="grid gap-10 py-4 lg:grid-cols-[45%_55%] lg:items-center lg:gap-12">
      <aside className={`lg:max-w-xl ${showAsideOnMobile ? '' : 'hidden lg:block'}`}>{aside}</aside>

      <div className="mx-auto w-full max-w-[32.5rem]">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-[0_18px_50px_rgba(11,25,44,.10)]">
          {children}
        </div>
      </div>
    </Container>
  );
}
