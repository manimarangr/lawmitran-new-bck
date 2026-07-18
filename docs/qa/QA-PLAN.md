# LawMitran — End-to-End QA Plan

Manual test plan covering every user-facing module. Run against a full local
stack (`docker compose up -d`, backend + frontend running, migrations applied,
`npm run seed`, `seed:documents`, `seed:stamp-duty`, `seed:content` executed).

Conventions: **[P]** = public (logged out) · **[C]** = client · **[L]** = lawyer ·
**[A]** = admin. Every ✅ requires both the expected UI outcome AND no console /
network errors.

---

## 1. Public site & SEO

- [ ] [P] Home page loads; hero question box, practice-area grid, "How it works" render.
- [ ] [P] Header nav: Find Lawyers, Legal Documents, Legal Guides (mega-menu with 14 categories on hover), How it Works. No "For Lawyers" item.
- [ ] [P] Footer: no phone number; www + support email present; `/terms`, `/privacy`, `/grievance`, `/faq`, `/contact` all load (no 404).
- [ ] [P] Legal Guides hub: category grid with counts, latest guides, ItemList JSON-LD in page source.
- [ ] [P] Open one guide: 12 sections render; byline shows "Review status: Pending Legal Review" (no fabricated reviewer name); Article + FAQPage + BreadcrumbList JSON-LD present; **no `editor` field** in Article JSON-LD while unreviewed.
- [ ] [P] Guide category page: guides listed; empty category shows "coming soon" and has `noindex` robots meta.
- [ ] [P] City × practice landing pages (`/lawyers/[city]/[area]`) render with metadata.
- [ ] [P] View-source on all public pages: unique `<title>`, meta description, canonical.

## 2. Auth

- [ ] [P] Signup as CLIENT: role cards, validation errors (bad mobile, weak password, unchecked consents), captcha (if enabled), → OTP screen; OTP in backend console; verify → login with "Mobile verified" banner.
- [ ] [P] Signup as LAWYER: same flow, role LAWYER, redirects into onboarding after login.
- [ ] [P] Signup rejects duplicate email/mobile with a clear message.
- [ ] [P] Login: wrong password error; correct → role dashboard (client/lawyer/admin).
- [ ] [P] Login with `?next=`: open a lawyer profile, click Contact Lawyer while logged out → login page → after signing in you land **back on the same page**, filters intact.
- [ ] [P] Forgot password: email sent (console), reset link works, old refresh tokens revoked.
- [ ] [A] Admin login requires 2FA code when enabled (code in console without SMTP).
- [ ] Self-registration with role ADMIN is rejected by the API.
- [ ] Refresh-token rotation: stay idle past access-token expiry (15 m), act again — silent refresh, no logout; reuse of an old refresh token fails.

## 3. Lawyer search (Find Lawyers)

- [ ] [P] Hero card: practice area + city + Search. City owns autocomplete: click empty field → "Popular cities" (Chennai, Bengaluru, Mumbai, Delhi, Kolkata, Hyderabad, Pune, Ahmedabad) then "More cities" alphabetical.
- [ ] [P] Alias search: type "trichy" → Tiruchirappalli; "bangalore" → Bengaluru; "hosur", "ooty", "salem" all found.
- [ ] [P] Sidebar has **no** City/Practice Area duplicates — only Use my location, Locality (metros only), Language, Gender, Rating, Experience, Sort.
- [ ] [P] Locality: select Chennai → Locality dropdown appears (Tambaram, T. Nagar, …); pick one → tagged/nearby lawyers sort first with "Near X (~N km)" badge; list is never empty because of locality (boost, not filter); switching city clears locality.
- [ ] [P] Small city (e.g. Salem): locality dropdown hidden.
- [ ] [P] Only APPROVED lawyers appear; EXPIRED-subscription lawyers still visible in search.
- [ ] [P] Map view: markers match list; "Search this area" re-queries by bounds.
- [ ] [P] Lawyer profile page by slug: photo, practice areas, offices, ratings, awards; JSON-LD.

## 4. Leads (client ↔ lawyer)

- [ ] [C] Submit requirement from a profile → appears in My Requests as NEW.
- [ ] [L] Lead appears for matching lawyer; reveal contact; status transitions NEW → CONTACTED → CLOSED.
- [ ] [L] EXPIRED-subscription lawyer receives **no** new leads.
- [ ] [C] Withdraw works; Report lawyer flows to admin moderation.
- [ ] [C] Confirm-contact prompt after lawyer marks contacted.

## 5. Lawyer onboarding & profile

- [ ] [L] Onboarding create: identity (cert + photo required), practice areas (2–5), city, office address + PIN, map pin; Locality dropdown appears for metro city; submit → PENDING verification.
- [ ] [L] Photo > 2 MB rejected instantly with message ("maximum size is 2 MB"); server enforces the same via API.
- [ ] [L] Edit mode (My Profile): fields prefilled incl. locality; photo replace saves immediately and **renders** (MinIO policy) — check after page reload, not just the local preview.
- [ ] [L] Locations page: add/edit offices, locality dropdown for metros, office photos ≤ 3 and ≤ 2 MB each, service areas capped per plan.
- [ ] [A] Approvals queue: review docs, approve → lawyer becomes searchable; reject with comment → lawyer sees reason and can resubmit.

## 6. Subscriptions & payments

- [ ] [L] Plans page lists admin-configured plans; trial state shown.
- [ ] [L] Test-mode Razorpay checkout completes; subscription ACTIVE; invoice generated with GST fields.
- [ ] [L] Renewal reminders at configured day offsets (check console/email).
- [ ] [A] Transactions list + invoice detail print view (print icon renders).

## 7. Legal documents marketplace

- [ ] [P] Catalog & template pages public (SEO); search by keywords.
- [ ] [C] Fill wizard (sections stepped), live preview, quote incl. stamp duty where applicable, test payment, document unlocked; PDF downloads; verify page confirms hash.
- [ ] [C] Content flags: watermark/QR per admin settings.
- [ ] [C] Lawyer review purchase (if enabled): review queue → lawyer decision → client notified.
- [ ] Feature flags: disable each DOCS_* flag in Admin → Settings and confirm the feature turns off gracefully.
- [ ] Mock e-Sign / e-Stamp: request → webhook simulation → status updates; no real vendor calls.

## 8. Legal Help Center (CMS)

- [ ] [A] Sidebar shows "Legal Help Center" (OPS scope). Dashboard cards: All / Drafts / Pending Review / Scheduled / Published / Archived with correct counts; type filter recalculates counts; clicking a card filters the list; click again clears.
- [ ] [A] Create draft (each type: Guide/News/Judgment/Notification/FAQ) → editor.
- [ ] [A] Editor: title/slug/excerpt/body; structured sections + FAQs JSON accepted (bad JSON → visible error, no crash); SEO fields with meta-description counter; category select scoped to type; **practice-area chips from platform master list** (no free text); state chips; category auto-fills a matching practice area when none picked.
- [ ] [A] Workflow: only legal transitions offered; illegal transition via API returns 400.
- [ ] [A] Scheduling: publish with future time → item in "Scheduled" bucket with Scheduled chip, **not** on public site; after the time passes it appears publicly without restart.
- [ ] [A] Revision history: every save adds a snapshot; list shows timestamps.
- [ ] [A] Reviewers tab: add reviewer (real advocates only — placeholder shown until then); assign in editor; set "Legally Reviewed" → public page shows "Reviewed by <name>" and Article JSON-LD gains `editor`.
- [ ] [P] Public guides read from DB after `seed:content` (edit a title in admin, publish, verify it appears within revalidate window ~5 min).

## 9. Client dashboard & account

- [ ] [C] My Requests, My Documents, Property Check pages load.
- [ ] [C] Settings: avatar upload ≤ 2 MB with hint text; oversize shows exact message; photo persists after reload and shows in the **dashboard nav** and public header.
- [ ] [C] Change password (old sessions revoked), change mobile via OTP, delete account (type DELETE) → sign-out everywhere, login blocked.
- [ ] [C/L] Notifications: unread badge, list, mark-read.

## 10. Admin console (other modules)

- [ ] [A] Users: search, suspend/restore.
- [ ] [A] Practice areas CRUD reflected in lawyer onboarding and CMS editor chips.
- [ ] [A] Moderation: reported reviews/lawyers actionable.
- [ ] [A] Settings: each group saves; values override env; audit log records changes with admin identity.
- [ ] [A] RBAC: FINANCE admin cannot see Content/Approvals; OPS cannot edit Settings (SUPER-only).

## 11. Cross-cutting

- [ ] Mobile viewport (~390 px): header hamburger with guide categories, search usable, dashboards usable.
- [ ] Accessibility spot-checks: focus visible, labels on inputs, dialogs trap Escape, `role="alert"` on errors.
- [ ] 404 page for unknown routes; API 404s don't white-screen the UI.
- [ ] Restart backend: MinIO log line "Public-read policy applied…"; images still load.
