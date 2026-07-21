import Icon from '@/components/ui/Icon';

export interface SignupBenefit {
  icon: string;
  text: string;
}

/** Shared benefits panel for both signup pages — title/subtitle/illustration/benefits differ per role. */
export default function SignupAside({
  title,
  subtitle,
  illustration,
  benefits,
  children,
}: {
  title: string;
  subtitle: string;
  illustration: React.ReactNode;
  benefits: SignupBenefit[];
  /** Extra content rendered below the benefits list (e.g. lawyer plan cards). */
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 hidden lg:block">{illustration}</div>

      <h1 className="text-[1.75rem] font-extrabold leading-tight text-navy sm:text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-500">{subtitle}</p>

      <ul className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-1">
        {benefits.map((b) => (
          <li key={b.text} className="flex items-start gap-2.5">
            <Icon name={b.icon} aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
            <span>{b.text}</span>
          </li>
        ))}
      </ul>

      {children}
    </div>
  );
}
