import type { NextConfig } from "next";

/**
 * Location SEO — short root city URLs 301 to the canonical city hub
 * (/bangalore → /lawyers/bengaluru). Canonical pages keep the "lawyers"
 * keyword in the URL; aliases cover common alternate city names.
 * See docs/24-seo-and-landing-pages.md.
 */
const CITY_SLUGS = [
  "bengaluru",
  "chennai",
  "mumbai",
  "delhi",
  "hyderabad",
  "pune",
  "kolkata",
  "kochi",
];

const CITY_ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  madras: "chennai",
  calcutta: "kolkata",
  cochin: "kochi",
  "new-delhi": "delhi",
};

const nextConfig: NextConfig = {
  images: {
    // Local dev serves profile/office photos straight from MinIO on this
    // origin (S3_PUBLIC_URL is unset locally — see backend storage.service.ts).
    // Deployed envs proxy storage same-origin under /storage (docker/nginx/nginx.conf),
    // so no remote pattern is needed there.
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
        pathname: "/lawmitran-documents/**",
      },
    ],
    // `next start`'s image optimizer refuses upstream hosts that resolve to a
    // loopback/private IP by default (SSRF guard) — "localhost" always does,
    // so local MinIO needs this explicit opt-in. Only affects the one host/path
    // allow-listed above; deployed envs never hit this path (same-origin /storage).
    dangerouslyAllowLocalIP: true,
  },
  async redirects() {
    return [
      // /bengaluru → /lawyers/bengaluru
      ...CITY_SLUGS.map((city) => ({
        source: `/${city}`,
        destination: `/lawyers/${city}`,
        permanent: true,
      })),
      // /bangalore → /lawyers/bengaluru (alias → canonical slug)
      ...Object.entries(CITY_ALIASES).map(([alias, city]) => ({
        source: `/${alias}`,
        destination: `/lawyers/${city}`,
        permanent: true,
      })),
      // aliases under /lawyers too: /lawyers/bangalore → /lawyers/bengaluru
      ...Object.entries(CITY_ALIASES).map(([alias, city]) => ({
        source: `/lawyers/${alias}`,
        destination: `/lawyers/${city}`,
        permanent: true,
      })),
      // and for city×practice: /lawyers/bangalore/family-law → /lawyers/bengaluru/family-law
      ...Object.entries(CITY_ALIASES).map(([alias, city]) => ({
        source: `/lawyers/${alias}/:area`,
        destination: `/lawyers/${city}/:area`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
