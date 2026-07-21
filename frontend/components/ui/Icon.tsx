/**
 * Inline SVG icon set replacing the FontAwesome icons used in sample-ui.
 * Stroke-based 24x24 icons, sized via font-size (1em) so they drop in
 * wherever the prototypes used <i class="fa-...">.
 */
import type { SVGProps } from "react";

const PATHS: Record<string, React.ReactNode> = {
  "scale-balanced": (
    <>
      <path d="M12 3v18M8 21h8M12 5l-6 2m6-2 6 2" />
      <path d="M6 7l-3 7a3.5 3.5 0 0 0 6 0L6 7zm12 0-3 7a3.5 3.5 0 0 0 6 0l-3-7z" />
    </>
  ),
  star: <path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7L12 3z" />,
  "star-fill": <path fill="currentColor" stroke="none" d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7L12 3z" />,
  check: <path d="m5 13 4 4L19 7" />,
  print: (
    <>
      <path d="M7 8V4h10v4" />
      <rect x="4" y="8" width="16" height="8" rx="2" />
      <path d="M7 13h10v7H7z" />
    </>
  ),
  "circle-check": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.5 2.5 2.5 4.5-5" />
    </>
  ),
  "circle-xmark": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </>
  ),
  "circle-info": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M12 11v5" />
    </>
  ),
  "circle-question": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.1 1-1.1 1.8m0 3h.01" />
    </>
  ),
  xmark: <path d="m6 6 12 12M18 6 6 18" />,
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9zm4 8.5a2 2 0 0 0 4 0" />,
  "bell-slash": (
    <>
      <path d="M6 9a6 6 0 0 1 9.3-5M18 9c0 4 1.5 5.5 1.5 5.5H9m1 3a2 2 0 0 0 4 0" />
      <path d="M3 3l18 18" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </>
  ),
  key: <path d="M14 10a4 4 0 1 0-3.5 3.97L8 16.5V19h2.5l1-1v-2h2l1.6-1.6A4 4 0 0 0 14 10zm1-1h.01" />,
  flag: <path d="M5 21V4m0 1h13l-2.5 3.5L18 12H5" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-slash": (
    <>
      <path d="M2.5 12S6 5.5 12 5.5c1.6 0 3 .5 4.3 1.2M21.5 12S18 18.5 12 18.5c-1.6 0-3-.5-4.3-1.2" />
      <path d="M3 3l18 18" />
    </>
  ),
  "phone-volume": <path d="M4 5c0 8 7 15 15 15l2-4-4.5-2-2 2c-2.5-1-4.5-3-5.5-5.5l2-2L9 4 4 5z" />,
  phone: <path d="M4 5c0 8 7 15 15 15l2-4-4.5-2-2 2c-2.5-1-4.5-3-5.5-5.5l2-2L9 4 4 5z" />,
  "credit-card": (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
      <path d="M2.5 9.5h19M6 15h4" />
    </>
  ),
  "location-crosshairs": (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  "hand-pointer": (
    <>
      <path d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10m0 0V8.5a1.5 1.5 0 0 1 3 0V11m0 0v-1a1.5 1.5 0 0 1 3 0v5.5a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.8-2.4l-2.7-3.6a1.6 1.6 0 0 1 2.3-2.2L9 15V11z" />
    </>
  ),
  "location-dot": (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  "map-location-dot": (
    <>
      <path d="M12 15s4.5-4 4.5-7.2A4.5 4.5 0 1 0 7.5 7.8C7.5 11 12 15 12 15z" />
      <path d="M8 13.5 3 15.5v5l6-2 6 2 6-2v-5l-3-1.2" />
    </>
  ),
  "arrow-left": <path d="M19 12H5m6-6-6 6 6 6" />,
  "arrow-right": <path d="M5 12h14m-6-6 6 6-6 6" />,
  "arrow-right-from-bracket": <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4m5-4 4-4-4-4m4 4H9" />,
  "arrow-trend-up": <path d="M3 17l6-6 4 4 8-8m0 0h-5m5 0v5" />,
  "arrow-rotate-left": <path d="M4 5v5h5M4.5 10A8 8 0 1 1 4 14" />,
  "rotate-right": <path d="M20 5v5h-5m4.5 0A8 8 0 1 0 20 14" />,
  "clock-rotate-left": (
    <>
      <path d="M4 5v5h5" />
      <path d="M4.5 10A8 8 0 1 1 4 14" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  "folder-open": <path d="M3 6a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v2H6l-3 8V6zm0 12h15l3-8H6l-3 8z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  "hourglass-half": <path d="M6 3h12M6 21h12M7 3c0 8 10 8 10 0M7 21c0-8 10-8 10 0M9.5 17.5h5" />,
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 5.5a3.5 3.5 0 0 1 0 6.5m2 8h3.5a6.5 6.5 0 0 0-4.5-6.2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  "user-check": (
    <>
      <circle cx="10" cy="8" r="4" />
      <path d="M2.5 20.5a7.5 7.5 0 0 1 15 0" />
      <path d="m15.5 10.5 2.5 2.5 4-4.5" />
    </>
  ),
  "triangle-exclamation": <path d="M12 4 2.5 20h19L12 4zm0 6v4m0 3h.01" />,
  tags: (
    <>
      <path d="m3 11 8-8h6a2 2 0 0 1 2 2v6l-8 8a2 2 0 0 1-2.8 0L3 13.8A2 2 0 0 1 3 11z" />
      <circle cx="15" cy="8" r="1.5" />
    </>
  ),
  "shield-halved": <path d="M12 3 4.5 6v5c0 5 3 8.5 7.5 10 4.5-1.5 7.5-5 7.5-10V6L12 3zm0 0v18" />,
  "magnifying-glass": (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  "magnifying-glass-plus": (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M8 10.5h5m-2.5-2.5v5" />
    </>
  ),
  "magnifying-glass-minus": (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M8 10.5h5" />
    </>
  ),
  inbox: <path d="M4 4h16v16H4V4zm0 10h4.5a3.5 3.5 0 0 0 7 0H20" />,
  "gauge-high": (
    <>
      <path d="M4 18a9 9 0 1 1 16 0" />
      <path d="m12 13 4-4.5" />
      <circle cx="12" cy="14" r="1.5" />
    </>
  ),
  "chart-line": <path d="M4 4v16h16M7 14l3.5-4 3 3L18 8" />,
  whatsapp: (
    <>
      <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" />
      <path d="M9 8.5c0 4 2.5 6.5 6.5 6.5l.8-1.8-2.2-1-.9.9c-1.2-.5-2-1.3-2.5-2.4l1-1-1-2.2-1.7.5z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  pen: <path d="m14.5 5.5 4 4L8 20H4v-4L14.5 5.5zm2-2 1.6-1.6a1.4 1.4 0 0 1 2 0l2 2a1.4 1.4 0 0 1 0 2L20.5 7.5" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="8" r="1.6" fill="#fff" stroke="none" />
      <path d="M6.2 11h2.6v7H6.2v-7zm4.4 0h2.5v1c.6-.8 1.4-1.2 2.5-1.2 1.9 0 3 1.3 3 3.6V18h-2.6v-3.2c0-1-.4-1.7-1.3-1.7-.7 0-1.2.5-1.4 1-.1.2-.1.4-.1.7V18h-2.6v-7z" fill="#fff" stroke="none" />
    </>
  ),
  facebook: (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path d="M13.5 8.5h1.8V6.2h-2c-2 0-3 1.1-3 3v1.6H8.7v2.4h1.6V18h2.4v-4.8h1.8l.4-2.4h-2.2v-1.3c0-.6.2-1 1-1z" fill="#fff" stroke="none" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" strokeWidth="1.6" />
      <circle cx="16.6" cy="7.4" r="1.1" fill="#fff" stroke="none" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" fill="currentColor" stroke="none" />
      <path d="m10.2 9 5 3-5 3V9z" fill="#fff" stroke="none" />
    </>
  ),
  "x-twitter": (
    <>
      <circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" />
      <path d="m8 8 8 8m0-8-8 8" stroke="#fff" strokeWidth="1.7" fill="none" strokeLinecap="round" />
    </>
  ),
  crown: <path d="m4 8 4 4 4-7 4 7 4-4-1.5 11h-13L4 8z" />,
  crosshairs: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7m4 4v6m4-6v6" />,
  sliders: <path d="M4 7h10m4 0h2M4 12h4m4 0h8M4 17h13m3 0h0M14 5v4M8 10v4M17 15v4" />,
  infinity: <path d="M8 12c-4 4.5-6-1-3.5-2.5S10 11 12 12s5 4 7.5 2.5S16 7.5 12 12c-1.3 1.5-2.7 3-4 0z" />,
  "id-badge": (
    <>
      <rect x="6" y="3" width="12" height="18" rx="2" />
      <path d="M10 3h4M9.5 17a2.5 2.5 0 0 1 5 0" />
      <circle cx="12" cy="11" r="2" />
    </>
  ),
  "id-card": (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <circle cx="8" cy="11" r="2" />
      <path d="M5.5 16a2.5 2.5 0 0 1 5 0M14 9h5m-5 4h5" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5 13.5 5h-3L12 2.5zM12 21.5 10.5 19h3L12 21.5zM3.8 7.3 6.7 7 5.2 9.6 3.8 7.3zm16.4 9.4-2.9.3 1.5-2.6 1.4 2.3zM3.8 16.7l1.4-2.3 1.5 2.6-2.9-.3zM20.2 7.3l-1.4 2.3L17.3 7l2.9.3z" />
    </>
  ),
  gavel: <path d="m13 5 6 6m-8-4 6 6M12 6l5 5-8 8-5-5 8-8zM3 21h9" />,
  "file-shield": (
    <>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h5M14 3l5 5m-5-5v5h5" />
      <path d="M17.5 12 14 13.5v2.5c0 2.3 1.4 4 3.5 5 2.1-1 3.5-2.7 3.5-5v-2.5L17.5 12z" />
    </>
  ),
  "file-invoice": (
    <>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5zm0 0v5h5" />
      <path d="M8 12h8m-8 4h8" />
    </>
  ),
  "file-arrow-up": (
    <>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5zm0 0v5h5" />
      <path d="M12 17v-5m-2.5 2.5L12 12l2.5 2.5" />
    </>
  ),
  envelope: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 6.5 8.5 6 8.5-6" />
    </>
  ),
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "chevron-down": <path d="m5 9 7 7 7-7" />,
  camera: (
    <>
      <path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>
  ),
  "up-right-from-square": <path d="M14 4h6v6m0-6L10 14M10 5H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-5" />,
  spinner: <path d="M12 3v3m6.4-.4-2.1 2.1M21 12h-3m.4 6.4-2.1-2.1M12 21v-3m-6.4.4 2.1-2.1M3 12h3m-.4-6.4 2.1 2.1" />,
  "paper-plane": <path d="M21 3 3 10.5l7 3.5m11-11L14 21l-4-7m11-11L10 14" />,
  "note-sticky": <path d="M4 4h16v10l-6 6H4V4zm10 16v-6h6" />,
  "mobile-screen-button": (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M12 18.5h.01" />
    </>
  ),
  "list-check": <path d="M3.5 6.5 5 8l2.5-3M3.5 13.5 5 15l2.5-3M3.5 20.5 5 22l2.5-3M11 7h10M11 14h10M11 21h10" />,
  language: <path d="M3 5h8M7 3v2c0 4-2 7-4 8m2-5c1 3 3 5 6 6m1 6 4-10 4 10m-1.5-3.5h-5" />,
  download: <path d="M12 3v11m-4-4 4 4 4-4M4 21h16" />,
  bookmark: <path d="M6 3h12v18l-6-4.5L6 21V3z" />,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />,
};

export type IconName = keyof typeof PATHS;

interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: string;
}

export default function Icon({ name, className = "", ...rest }: IconProps) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] ${className}`}
      {...rest}
    >
      {paths}
    </svg>
  );
}
