# Puffbase Stripe Integration Plan

Business: puff-base.com — AI site builder. Users subscribe (free / builder / builder-yearly / business), generated sites publish to subdomains.
Products: Payments, Connect, Billing, Invoicing, Tax.

## Confirmed decisions

- **Connect role**: generated sites accept payments from their visitors; Puffbase takes a platform fee.
- **Charge pattern**: destination charges (Puffbase is merchant of record; funds routed to the site owner's connected account).
- **Connected account config (Accounts v2)**: `dashboard: "none"`, `fees_collector: "application"`, `losses_collector: "application"`, merchant capability `card_payments`, recipient `transfers`.
  - Compatibility: `none/application/application` + destination = ALLOWED.
- **Billing**: hybrid — Stripe Billing for flat subscriptions, Lago stays for usage metering.
- **Tax**: Stripe Tax for Puffbase's own subscription sales (US + international registrations).

## ⚠️ Open decision: tax + merchant of record

With **destination charges, Puffbase is merchant of record** for site checkouts — Stripe Tax would calculate on *your* account and *you* carry remittance liability for every seller's sales. "Connected accounts handle their own tax" is only true under **direct charges**.

Pick one before building site checkout:

- **A. Keep destination charges** → platform tax registrations apply to site sales. Simplest code, heaviest liability. Most marketplace-style site builders accept this and set tax behavior per product.
- **B. Direct charges for site checkout** (`stripeAccount` header + `application_fee_amount`) → seller is MoR, seller handles tax, disputes debit the seller. Requires `dashboard: "express"` (or full) for seller self-remediation — `dashboard: "none"` + direct is BLOCKED. Express + direct + `application`/`application` is ALLOWED and stable.

Recommendation: **B** if sellers are real merchants selling goods; **A** if site payments are closer to tips/simple checkouts and you want full UX control.

## Existing integration review

`server/stripe.ts` + `server/lago.ts` — solid bones (Checkout setup mode keeps PCI out of scope; Lago→Stripe customer linking is correct). Gaps vs. current best practice:

| Area | Current | Issue |
|---|---|---|
| SDK | `stripe@^22.6.2` | Upgrade to `^23.0.0` |
| API version | unpinned | Pin `apiVersion: "2026-09-30.endive"` on the `Stripe` client |
| API key | `STRIPE_SECRET_KEY` (`sk_`) | Use a restricted key (`rk_`) scoped to Checkout, Customers, PaymentIntents, Accounts v2, Webhooks |
| Fulfillment | success-page `confirmCardSetup` | Race-prone — add a webhook endpoint; `checkout.session.completed` is the reliable path |
| Webhooks | none | Required for subscriptions, disputes, Connect account state. Not optional. |
| Connect | none | All new work |
| Billing | Lago subscriptions | Keep Lago for usage; move flat plans to Stripe Billing |

## Implementation phases

### Phase 1 — Foundation
1. `npm i stripe@^23` ; pin `apiVersion: "2026-09-30.endive"` in `server/stripe.ts`.
2. Create a Stripe **sandbox** for dev (Dashboard → Sandboxes); keep test-mode keys out of prod env.
3. Issue a restricted key (`rk_test_…` / `rk_live_…`); set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` env vars.
4. Add `POST /api/stripe/webhook` — raw body, `stripe.webhooks.constructEvent`, fast 200 + async handling. Move card-confirm fulfillment to `checkout.session.completed` (keep the success-page confirm as a UX fast-path).

### Phase 2 — Connect (site payments)
1. Enable Connect in Dashboard (platform profile, branding — sellers see it in onboarding).
2. Accounts v2: create connected account per site owner on their first "accept payments" action — `dashboard: "none"`, `defaults.responsibilities.fees_collector: "application"`, `losses_collector: "application"`, capabilities `card_payments` + `transfers`. Store `stripeConnectedAccountId` on the project.
3. Onboarding: embedded `account_onboarding` + `notification_banner` + `account_management` components (Account Sessions API). With `dashboard: "none"` you own KYC remediation surfacing — budget for it.
4. Site checkout: Checkout Session on the platform account with `payment_intent_data.transfer_data.destination` + `payment_intent_data.application_fee_amount`. Never set `payment_method_types` — use Dashboard payment-method configurations.
5. Seller-facing views: embedded `payments` (reduced detail under destination charges) + `payouts` components.
6. Disputes: `charge.dispute.created` webhook → debit platform → **explicit `transfer_reversals`** recovery (disputes don't auto-reverse; refunds need `reverse_transfer: true`).
7. Fee math: with destination charges Stripe fees hit the platform — set `application_fee_amount` ≥ your cut + estimated processing fee, or use the Platform Pricing Tool.

### Phase 3 — Billing (flat plans) + Invoicing
1. Create Products/Prices in Stripe for `builder`, `builder-yearly`, `business`.
2. Replace `createCardSetupSession` flow with Checkout `mode: "subscription"` (still saves card + starts sub in one step), or keep setup-mode and create the Subscription server-side on publish (current "billing starts when live" trigger maps to `subscriptions.create` with `trial_end` = publish time).
3. Customer Portal session for plan changes/cancellation — replaces building that UI.
4. Webhooks: `customer.subscription.updated/deleted`, `invoice.paid`, `invoice.payment_failed` → update project status (dunning → unpublish path).
5. Lago: keep `emitUsageEvent` metering only; drop Lago flat-plan subscriptions once Stripe Billing subs are live.
6. Stripe Invoicing: use for one-off/manual charges (enterprise deals). Note: Invoicing/subscriptions *for connected accounts' sales* is caution territory with destination charges — keep Stripe Invoicing platform-side only.

### Phase 4 — Tax
1. Dashboard → Tax: set origin address, product tax code (SaaS/website-builder → likely `txcd_10103000` general SaaS or per your tax advice).
2. **Registrations first**: `automatic_tax` silently collects nothing without an active registration. Register via Tax → Registrations (US states by threshold + VAT/GST jurisdictions).
3. `automatic_tax: { enabled: true }` on subscription Checkout/invoices; collect `customer_details.address` + validate VAT IDs via Tax IDs API.
4. Revisit the MoR decision above before enabling tax on site checkouts.

## Webhook event checklist

`checkout.session.completed`, `checkout.session.async_payment_succeeded` (fulfillment, gated on `payment_status`), `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`, `account.updated` / v2 account events (capability status), `charge.dispute.created`, `payout.failed`, `transfer.created`/`transfer.reversed`.

## Env vars

```
STRIPE_SECRET_KEY=rk_…        # restricted, not sk_
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PUBLISHABLE_KEY=pk_…   # client
LAGO_API_URL / LAGO_API_KEY   # unchanged (usage metering only)
```
