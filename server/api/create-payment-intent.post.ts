import Stripe from "stripe";
import { createError, defineEventHandler, readBody } from "h3";
import { useRuntimeConfig } from "#imports";

import { resolvePremiumSelection } from "../utils/premiumPlans";

/**
 * Starts the one-time payment a premium registration is completed with.
 *
 * Authoritative decision:
 * `docs/adr/ADR-010-server-side-payment-amount-authority.md`.
 *
 * This route is deliberately **public** — an anonymous visitor has to be able to
 * begin a purchase — and that is precisely why it may not trust its input.
 * Before HOR-72 it read `amount` and `currency` straight from the request body
 * and handed them to Stripe unchecked, so a visitor could choose what they were
 * billed. It now reads neither. The client names a plan; `premiumPlans.ts`
 * prices it.
 *
 * The access classification is unchanged and still governed by ADR-007, which
 * covers *who may call* an endpoint rather than what the handler does with the
 * body.
 */

/**
 * The Stripe API version this handler is written against.
 *
 * Pinning it stops a future SDK upgrade from silently changing the shape of a
 * charge. The type annotation is doing real work: the SDK types `apiVersion` as
 * `Stripe.LatestApiVersion`, a string literal, so when a later major moves the
 * version on, the build fails here and the upgrade has to be reviewed instead of
 * absorbed.
 */
const STRIPE_API_VERSION = "2026-07-29.dahlia" satisfies Stripe.LatestApiVersion;

/** What the caller is told when the payment cannot be started. */
const UNAVAILABLE = "The payment could not be started. Please try again.";

/**
 * Record a Stripe failure without recording what failed.
 *
 * The error object is never logged whole: `StripeError.raw` carries the full API
 * response, which for a `PaymentIntent` includes its client secret. Only the
 * three fields needed to find the request in the Stripe dashboard are kept.
 */
const logStripeFailure = (error: unknown): void => {
  if (error instanceof Stripe.errors.StripeError) {
    console.error("create-payment-intent: Stripe rejected the request", {
      type: error.type,
      code: error.code,
      requestId: error.requestId,
    });

    return;
  }

  console.error("create-payment-intent: the Stripe call failed");
};

export default defineEventHandler(async (event) => {
  const secretKey = useRuntimeConfig(event).NUXT_STRIPE_SECRET_KEY;

  if (typeof secretKey !== "string" || secretKey === "") {
    // A missing key is a deployment fault, not a caller fault. The log says so;
    // the response does not, because the client learns nothing useful from the
    // shape of our environment.
    console.error(
      "create-payment-intent: the Stripe secret key is not configured"
    );

    throw createError({ statusCode: 500, statusMessage: UNAVAILABLE });
  }

  // A body that is not JSON is a malformed request like any other, not an
  // unhandled parse error. `resolvePremiumSelection` refuses `null` with a 400.
  const body = await readBody(event).catch(() => null);

  const resolved = resolvePremiumSelection(body);

  if (!resolved.ok) {
    throw createError({
      statusCode: resolved.statusCode,
      statusMessage: resolved.message,
    });
  }

  const { selection } = resolved;

  const stripe = new Stripe(secretKey, { apiVersion: STRIPE_API_VERSION });

  let paymentIntent: Stripe.PaymentIntent;

  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: selection.amount,
      currency: selection.currency,
      description: selection.description,
      // The customer's card is attached in the browser, by Stripe Elements, at
      // confirmation time. The handler used to force `pm_card_visa` — a Stripe
      // *test* token — which would have rejected every real card in a live
      // deployment. Naming the type explicitly keeps this a card-only payment;
      // offering further payment methods is a product decision, not a
      // modernisation one.
      payment_method_types: ["card"],
      metadata: {
        plan_id: selection.planId,
        tier: String(selection.tier),
        frequency: selection.frequency,
      },
    });
  } catch (error) {
    logStripeFailure(error);

    throw createError({ statusCode: 500, statusMessage: UNAVAILABLE });
  }

  if (paymentIntent.client_secret === null) {
    // Documented as nullable, and unusable if it ever is. Fail loudly rather
    // than send the browser a `null` to confirm with.
    console.error(
      "create-payment-intent: Stripe returned no client secret",
      { paymentIntentId: paymentIntent.id }
    );

    throw createError({ statusCode: 500, statusMessage: UNAVAILABLE });
  }

  // A real 200 with a real body. The handler used to answer every outcome —
  // success, bad request, Stripe failure — with HTTP 200 and a `status` field
  // in a JSON string, so the browser had to parse the body to discover it had
  // failed. The amount is echoed back because the server decided it: the page
  // can now display the price it will actually be charged.
  return {
    clientSecret: paymentIntent.client_secret,
    amount: selection.amount,
    currency: selection.currency,
    planName: selection.planName,
  };
});
