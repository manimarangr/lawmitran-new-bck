# 09 — Client Module

The client (consumer) portal: discovery, lead submission, documents, and account.

## Registration & Auth

- Self-register with `role = CLIENT` (email + mobile + password); default role.
- Email verification + mobile OTP. JWT access/refresh like all users.
- Public browsing needs no account; **login is required only to submit a lead, bookmark, or buy a document.**

## Profile

- `GET /api/users/me`, `PATCH /api/users/me` — name, contact, location preferences, language.
- Contact details are shared with a lawyer only when the client submits a lead to them.

## Search & Discovery

The client's primary entry point is the **homepage search** and **top-rated lawyers** showcase
(modeled on the reference layout — see [15-search-and-matching.md](./15-search-and-matching.md)):

- **Homepage search bar:** `Select City` + `Select Practice Area` + **Search** → results page.
- **Top-rated lawyers** sections grouped by practice area, each a row of lawyer cards with a
  "View more <Area> lawyers" link, plus a generic "Find a lawyer" CTA.
- **Results page:** filter by city/state, practice area, language, experience; sort by relevance,
  rating, experience. Only `APPROVED` lawyers shown; premium lawyers ranked higher.
- **Lawyer profile:** public, SEO-indexed; shows verification badge, rating, areas, experience,
  location, languages, and a "Contact / Submit requirement" CTA.

### Lawyer card (showcase + results)

Each card shows: photo, name, star rating + review count, location, years of experience, and
"Practice areas: X +N more" — matching the reference design.

## Bookmarks (Favourites)

- `POST/DELETE /api/users/me/bookmarks/:lawyerId` — save/remove favourite lawyers.
- `GET` bookmarks list in the portal for quick re-access.

## Lead Submission & History

- From a profile or the homepage, the client submits a requirement: practice area, city, description.
- `POST /api/leads` routes it to eligible verified lawyers (see [14-lead-management.md](./14-lead-management.md)).
- `GET /api/leads/me` — lead history with statuses (`NEW → CONTACTED → CLOSED`).
- After a lead is `CLOSED`, the client can rate the lawyer (`POST /api/leads/:id/rating`, score 1–5 + comment).

## Purchased Documents

- Browse the document marketplace publicly; generate from a template and pay to download.
- `GET /api/users/me/documents` — purchased/generated documents, re-downloadable via signed URLs.
- See [11-document-marketplace.md](./11-document-marketplace.md).

## Notifications

- `GET /api/users/me/notifications` — lead status changes, document ready, receipts.
- Delivered in-app and via email/SMS/WhatsApp depending on type and preference.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/lawyers` | Search verified lawyers (public) |
| GET | `/api/lawyers/:id` | Public profile |
| POST | `/api/leads` | Submit requirement |
| GET | `/api/leads/me` | Lead history |
| POST | `/api/leads/:id/rating` | Rate closed lead |
| POST/DELETE | `/api/users/me/bookmarks/:lawyerId` | Manage bookmarks |
| GET | `/api/users/me/documents` | Purchased documents |
| GET | `/api/users/me/notifications` | Notifications |

---
**Related:** [15-search-and-matching.md](./15-search-and-matching.md) · [11-document-marketplace.md](./11-document-marketplace.md) · [14-lead-management.md](./14-lead-management.md)
