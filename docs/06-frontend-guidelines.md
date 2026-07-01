# 06 — Frontend Guidelines

> **Today:** the `frontend` workspace is not yet scaffolded. This is the target standard for the
> Next.js (App Router) application.

## Stack

- **Next.js (App Router)** with SSR/ISR for public, SEO-critical pages.
- **TypeScript** everywhere; strict mode on.
- **Tailwind CSS** for styling; **shadcn/ui** for the component primitives.
- **TanStack Query** for server state; lightweight `zustand`/context for UI state.
- **react-hook-form + zod** for forms and validation (mirror backend DTO rules).

## UI Standards

- **Mobile-first.** Design at 360px, scale up. Public pages must be fully usable on low-end phones.
- **Accessibility (WCAG 2.1 AA):** semantic HTML, labelled inputs, visible focus rings, `aria-*` where
  needed, colour contrast ≥ 4.5:1, keyboard-navigable. shadcn/ui primitives are accessible by default —
  don't strip their a11y attributes.
- **Responsive layouts:** Tailwind breakpoints (`sm md lg xl`); container queries for cards/lists.
- **Loading & empty states:** every async view has skeletons, empty, and error states.
- **i18n-ready:** wrap user-facing strings; plan for multilingual (Hindi + regional) content.

## Tailwind & shadcn/ui

- Use Tailwind utility classes; extract repeated patterns into components, not `@apply` soup.
- Theme tokens (colours, spacing, radius) defined once in `tailwind.config` + CSS variables.
- Add shadcn/ui components via the CLI; keep them in `components/ui`, customise via variants, not forks.
- One accent/brand colour, neutral greys, semantic colours for success/warning/danger.

## Page Structure (App Router)

```
app/
├── (public)/                # SSR/ISR, no auth
│   ├── page.tsx             # homepage + search
│   ├── lawyers/
│   │   ├── page.tsx         # search results
│   │   └── [id]/page.tsx    # public profile (SEO)
│   └── documents/
│       ├── page.tsx         # categories
│       └── [slug]/page.tsx  # template detail
├── (client)/                # CLIENT dashboard, auth-gated
│   ├── dashboard/
│   ├── leads/
│   ├── bookmarks/
│   └── documents/
├── (lawyer)/                # LAWYER dashboard, auth-gated
│   ├── profile/
│   ├── verification/
│   ├── leads/               # inbox
│   └── subscription/
├── (admin)/                 # ADMIN console, role-gated
├── (auth)/                  # login / register / verify
├── layout.tsx
└── globals.css
```

## Folder Structure

```
src/
├── app/                     # routes (above)
├── components/
│   ├── ui/                  # shadcn primitives
│   └── features/            # composed feature components
├── lib/                     # api client, utils, auth helpers
├── hooks/                   # reusable hooks
├── stores/                  # zustand stores
├── types/                   # shared TS types (mirror backend DTOs)
└── styles/
```

## Naming Conventions

- Components: `PascalCase` files (`LawyerCard.tsx`).
- Hooks: `useCamelCase` (`useLeadInbox.ts`).
- Utilities/vars: `camelCase`; constants `SCREAMING_SNAKE_CASE`.
- Routes/slugs: `kebab-case`.
- One component per file; co-locate component-specific subcomponents.

## State Management

- **Server state:** TanStack Query (caching, retries, invalidation). Never duplicate server data in global stores.
- **UI/ephemeral state:** local `useState`/`useReducer`; cross-cutting UI in `zustand`.
- **Auth state:** access token in memory; refresh handled by a single API-client interceptor.
- **Forms:** react-hook-form + zod resolver; submit DTOs that match backend `class-validator` shapes.

## Data Fetching & SEO

- Public pages: server components with ISR (`revalidate`) for fresh-but-cached profiles/listings.
- Generate metadata per page (`generateMetadata`), structured data (JSON-LD `LegalService`/`Person`).
- Canonical URLs, sitemaps, and clean slugs for lawyers and document templates.
- Authenticated dashboards: client components + React Query against `/api`.

## Performance

- Image optimisation via `next/image`; lazy-load below the fold.
- Code-split dashboards; keep public bundles lean.
- Cache-friendly headers via NGINX/CDN for static and ISR content.

---
**Related:** [03-system-architecture.md](./03-system-architecture.md) · [09-client-module.md](./09-client-module.md) · [15-search-and-matching.md](./15-search-and-matching.md)
