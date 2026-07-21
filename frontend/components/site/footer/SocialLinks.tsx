import Icon from '@/components/ui/Icon';

const SOCIALS = [
  { name: 'linkedin', label: 'LinkedIn' },
  { name: 'facebook', label: 'Facebook' },
  { name: 'instagram', label: 'Instagram' },
  { name: 'youtube', label: 'YouTube' },
  { name: 'x-twitter', label: 'X (Twitter)' },
];

/** Social profile URLs aren't set up yet — placeholder hrefs until real handles exist. */
export default function SocialLinks() {
  return (
    <div className="flex items-center gap-3">
      {SOCIALS.map((s) => (
        <a
          key={s.name}
          href="#"
          aria-label={s.label}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-300 transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-gold hover:text-navy"
        >
          <Icon name={s.name} aria-hidden="true" className="text-base" />
        </a>
      ))}
    </div>
  );
}
