# 01 — Product Vision

> **Scope note:** This document describes the **target vision** for LawMitran. The current
> codebase is early scaffolding (auth + ratings implemented; most feature modules are stubs).
> Where useful, "Today" callouts flag the present state.

## Product Vision

LawMitran is a **legal marketplace for India** that connects people who need legal help with
verified, practising advocates — and lets them generate and buy ready-to-use legal documents.

It is a **lead-generation marketplace**, not a consultation-booking platform. A client describes a
legal requirement; the platform routes that requirement as a **lead** to verified, eligible lawyers;
the lawyer then contacts the client directly. There is **no in-app scheduling or messaging** in the
MVP — the value is qualified discovery and introduction, plus a self-service document marketplace.

**One-line:** *Find a verified lawyer, or get the legal document you need, in minutes.*

## Mission

To make quality legal help **discoverable, trustworthy, and affordable** for every Indian — across
languages, states, and practice areas — while giving advocates a low-friction, high-intent channel
to grow their practice.

Pillars:

- **Trust by verification** — every listed lawyer is Bar Council verified before going public.
- **Intent-matched leads** — lawyers receive only relevant, location- and practice-area-matched leads.
- **Self-service documents** — common legal paperwork (rent, affidavits, notices) without a lawyer visit.
- **Accessible** — multilingual, mobile-first, SEO-friendly public pages.

## Target Users

| Persona | Who they are | Primary job-to-be-done |
|---|---|---|
| **Client** | Individuals & small businesses needing legal help | Find a trustworthy lawyer fast; or buy/generate a legal document |
| **Lawyer** | Verified advocates (independent or small firms) | Receive qualified leads; build a credible public profile |
| **Super Admin** | LawMitran operations/trust team | Verify lawyers, manage plans & templates, monitor platform health |

Secondary users: **SEO visitors** (anonymous, browsing public profiles and the document store) who
convert into clients.

## Competitor Landscape

| Competitor | Model | LawMitran differentiation |
|---|---|---|
| **Vakilsearch** | Service/agency, fixed-price legal services | Marketplace of *independent verified lawyers*, not an agency |
| **LegalKart** | Consultation/call booking | Lead-gen (direct contact), no paywalled minutes |
| **LawRato** | Lawyer directory + Q&A | Stronger verification gate + integrated document marketplace |
| **Local directories (JustDial etc.)** | Unverified listings | Bar Council verification + intent-matched lead routing |

**Wedge:** verification-gated discovery + intent-matched lead routing + a document marketplace in one
place, tuned for Indian states, languages, and practice areas.

## MVP

The MVP proves the core loop: **client requirement → matched verified lawyers → lawyer contacts client.**

In scope:

- Client and lawyer registration, email + mobile (OTP) verification, JWT auth.
- Lawyer onboarding with Bar Council document upload and admin verification workflow.
- Public, unauthenticated lawyer search by location + practice area (verified lawyers only).
- Lead submission (login required) and a lawyer lead inbox.
- 30-day free trial for lawyers; lead routing excludes expired subscriptions.
- Basic document marketplace: browse categories, generate from template, pay, download PDF.
- Super Admin dashboard for verification approvals and plan/template management.
- Ratings on closed leads.

Out of scope for MVP: in-app chat/scheduling, AI features, mobile app, ElasticSearch, microservices.

## Long-term Roadmap (summary)

1. **Phase 1 — Core marketplace:** auth, lawyer onboarding/verification, search, lead submission.
2. **Phase 2 — Monetization:** document marketplace, subscriptions, payments, admin tooling.
3. **Phase 3 — Intelligence:** AI intake, AI matching, AI document generation/review, analytics, notifications.
4. **Phase 4 — Scale:** mobile app, ElasticSearch, microservices, AI contract review, case tracking.

See [18-roadmap.md](./18-roadmap.md) for the detailed, phased breakdown.

---
**Related:** [02-business-rules.md](./02-business-rules.md) · [03-system-architecture.md](./03-system-architecture.md) · [18-roadmap.md](./18-roadmap.md)
