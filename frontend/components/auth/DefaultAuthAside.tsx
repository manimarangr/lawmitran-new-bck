import Icon from '@/components/ui/Icon';

/** Generic info panel for login / forgot / reset / verify-otp (desktop only). */
export default function DefaultAuthAside() {
  return (
    <div className="max-w-md">
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
    </div>
  );
}
