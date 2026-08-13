# ADR-010: The server owns the payment amount, and the Stripe API version is pinned

**Status:** Accepted
**Date:** 2026-08-13
**Deciders:** Sammy

---

## Context

`server/api/create-payment-intent.post.ts` created the Stripe `PaymentIntent` that a
premium registration is paid with. It read `amount` and `currency` from the request body
and passed them to Stripe without checking either.

The route is classified **Public** in
[ADR-007](ADR-007-api-authentication-trust-boundary.md), and correctly so: an anonymous
visitor has to be able to begin a purchase. ADR-007 already recorded this handler's body
handling as a finding, and states that defects inside a handler are addressed by their own
issue rather than by changing the access classification. HOR-72 is that issue.

The price itself lived in the browser. `components/StripePeyment.vue` carried its own copy
of the price table, looked up the tier and frequency, stripped the `€`, multiplied by 100
and posted the result. Every number in that chain was editable by whoever was running the
page, so the amount Stripe charged was, in effect, a client-supplied value.

Four further facts about the same route were established during the Stage I audit:

- It set `payment_method: 'pm_card_visa'`. That is a Stripe **test** token. It would have
  rejected every real card the moment the deployment used a live key.
- It answered every outcome — success, bad request, Stripe failure — with HTTP 200 and a
  `status` field inside a JSON string in the body, so the browser had to parse the body to
  discover it had failed.
- It logged the caught error object whole. `StripeError.raw` carries the full API
  response, which for a `PaymentIntent` includes its client secret.
- It constructed `new Stripe(key)` with no `apiVersion`, so the effective API version was
  whatever the installed SDK happened to default to.

Separately, the project depended on `nuxt-stripe-module@3.2.0`, which is unmaintained. It
had no runtime consumer — its only trace was a `types` entry in `server/tsconfig.json` —
but it pulled a second major of `@stripe/stripe-js` into the dependency tree alongside the
declared one.

Finally, a contradiction was found and deliberately **not** resolved here: the pricing UI
speaks of Monthly and Annually subscriptions, while the implementation creates a one-time
`PaymentIntent` and no persistence exists that would activate Premium for an account.

---

## Decision

**The server is the only source of a payment amount. The amount does not travel from the
client.**

1. `server/utils/premiumPlans.ts` holds the premium catalogue and is the only place a
   price comes from. Amounts are integers in **minor units**, never derived at runtime
   from a formatted string.
2. The client sends a **selection**, not a price: `{ tier, frequency }`. `tier` is the
   plan's position in the catalogue, which is the identifier the existing
   `/premium/register/:type/:subscriptionType/` URL already carries. `frequency` is
   `"monthly"` or `"annually"`, lower case.
3. `resolvePremiumSelection` reads **only** those two fields. Any `amount`, `currency`,
   `planId` or `description` a caller sends is ignored rather than sanitised: a value that
   is never read cannot be smuggled past a check.
4. Refusals distinguish **400** — malformed, such as a non-integer tier or a body that is
   not an object — from **422** — well formed but naming something the catalogue does not
   price. Refusal messages never echo the rejected value back.
5. The money rules live in a module free of Nitro, Stripe and Nuxt imports, so they are
   tested as plain functions. The handler is thin glue over them, matching the
   `apiAccessPolicy` / `apiAccessControl` split this repository already uses.
6. **The Stripe API version is pinned** in the handler. The SDK types `apiVersion` as
   `Stripe.LatestApiVersion`, a string literal equal to the version that SDK ships
   against, so a later major that moves the version **fails `pnpm build`** at that line.
   The upgrade then has to be reviewed rather than absorbed.
7. Payments stay **card-only** via `payment_method_types: ["card"]`, matching the existing
   Stripe Elements Card integration. Offering further payment methods is a product
   decision, not a modernisation one.
8. Stripe failures log `type`, `code` and `requestId` and nothing else. The error object
   is never logged whole.
9. **The one-time `PaymentIntent` model is preserved.** This ADR introduces no Customer,
   no Subscription, no Checkout Session, no webhook and no database persistence.

`nuxt-stripe-module` is removed. `stripe` and `@stripe/stripe-js` are held at the current
stable majors.

---

## Rationale

Validating an incoming amount against a server-side table would have produced the same
numbers, and it would have been the wrong fix. It leaves the amount in the request, which
means the correctness of every charge depends on a check continuing to be applied — and a
check is one refactor away from being dropped. Removing the field from the conversation
entirely means there is no bypass to find. The security property stops being *behavioural*
and becomes *structural*.

The tier is kept as an array index rather than replaced with a slug because the URL
contract `/premium/register/${index}/${frequency}/` predates this change and is already
live. `id` carries the stable name alongside it, so a future issue can move to slugs
without another pricing change.

Pinning the API version matters more here than elsewhere in the codebase. An unpinned SDK
means a routine dependency bump can change how a charge is constructed, and the failure
would appear in production against real money rather than in CI. Because the SDK's own
type is a literal, pinning costs nothing to maintain and cannot silently drift: the build
breaks, deliberately, on the next major.

The subscription contradiction is real but is not a modernisation problem. Resolving it
requires a product decision, most likely Stripe subscriptions or Checkout, webhooks to
learn about renewals, and new persistence to record entitlement — which crosses
[ADR-003](ADR-003-prisma-schema-preservation.md). Doing any of that by inference inside a
dependency-modernisation stage would be exactly the kind of unasked-for architecture change
that these ADRs exist to prevent. It is tracked as **HOR-73**.

---

## Consequences

### Positive

- A visitor cannot choose what they are billed. The catalogue is unreachable from the
  browser.
- Pricing has one owner. Changing a price is a one-line change in a tested module.
- A real card can now be charged. `pm_card_visa` would have failed against a live key.
- The endpoint speaks HTTP. Callers see 400, 422 and 500, and the browser's `catch` is
  reached on failure instead of a 200 carrying bad news.
- A client secret can no longer reach the logs through an error object.
- One major of `@stripe/stripe-js` resolves instead of two, and an unmaintained module is
  gone.
- A future Stripe SDK major cannot change charge construction without breaking the build.

### Negative

- The price is now stated in two unconnected places: `premiumPlans.ts` charges it, while
  `components/payment.vue` and `components/PaymentCard.vue` display it. **They can drift.**
  This is accepted for now — the display duplication predates this change and already
  existed across those two components — but it is the first thing to fix if a price ever
  changes. The third copy, the one that actually *computed the charge*, is the one this
  ADR removed.
- The Pay button no longer shows an amount. `PaymentCard.vue` renders the price beside the
  form on the same page, so nothing is lost on screen; a component that no longer knows
  the amount must not display one.
- Adding a plan or changing a price now requires a deployment.
- **No idempotency key is sent.** A retried submission can create a second
  `PaymentIntent`. Real idempotency needs a client-supplied key, which is a design
  decision this issue was not scoped to make. Recorded here so it is a known limitation
  rather than an oversight.
- The pin will break the build on the next Stripe major. That is the intent, and it is
  still work someone has to do.

---

## Alternatives Considered

### Validate the client-supplied amount against a server table — Rejected

Same numbers, weaker guarantee. The amount stays in the request, so every future charge
depends on a check remaining in place. See Rationale.

### Move to Stripe Checkout Sessions — Rejected

Stripe would own the price and the page, which is genuinely attractive. It is also a
different payment architecture: it needs webhooks to learn the outcome, and persistence to
record it. That is a product decision requiring its own analysis and ADR, and it was
explicitly excluded from Stage I. Tracked as part of HOR-73.

### Hold the catalogue as Stripe `Price` and `Product` objects — Rejected

It would remove the display/charge duplication by making Stripe the single source. It also
makes rendering the pricing page depend on a live Stripe API call, introduces
test/live catalogue divergence, and needs a sync story for a catalogue of six values. Not
proportionate now; worth revisiting alongside HOR-73.

### Add a `premium-plans.get` endpoint so display and charge share a source — Deferred

This is the proportionate fix for the drift recorded above, and it was considered. It was
left out because it widens a payments diff that benefits from being small and reviewable,
and because the duplication it removes is pre-existing rather than introduced here.

### Enable `automatic_payment_methods` — Rejected

It would let Stripe offer additional payment methods. That changes what a customer can pay
with, which is a product change, not a modernisation.

---

## Review Triggers

- A premium price changes, or a plan is added or removed — fix the display duplication
  first.
- HOR-73 decides how Premium entitlement is actually granted. This ADR is likely to be
  superseded in part.
- A Stripe SDK major moves `LatestApiVersion` and the build fails at the pin.
- A second payment flow appears, such as auction deposits or vendor fees, that would share
  the catalogue.
- A requirement to charge in a currency other than EUR.
- Duplicate charges are observed in practice, making the missing idempotency key a real
  defect rather than a known limitation.
