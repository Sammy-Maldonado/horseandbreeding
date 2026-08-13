/**
 * The premium plan catalogue, and the only way to turn a client's selection
 * into an amount.
 *
 * Authoritative decision: `docs/adr/ADR-010-server-side-payment-amount-authority.md`.
 *
 * The browser used to compute the price and send it. `create-payment-intent`
 * passed that number to Stripe unchecked, so a visitor could choose what they
 * were billed. The correction is not extra validation on the way in — it is that
 * the amount never travels. The client names a plan; the server prices it here.
 *
 * Amounts are in **minor units**, which is what the Stripe API expects: 1900 is
 * €19.00. They are integers by construction, never derived from a formatted
 * string at runtime.
 *
 * This module is deliberately free of Nitro, Stripe and Nuxt imports so the
 * money rules can be tested as plain functions. See `premiumPlans.test.ts`.
 */

/** The single currency this catalogue prices in. */
export const PREMIUM_CURRENCY = "eur";

export type PremiumCurrency = typeof PREMIUM_CURRENCY;

/**
 * The billing frequencies the pricing page offers.
 *
 * These name the plan the customer chose. They do **not** describe a recurring
 * charge: the implementation creates a one-time `PaymentIntent`, and reconciling
 * that with the subscription language in the UI is HOR-73, not this module.
 */
export const PREMIUM_FREQUENCIES = ["monthly", "annually"] as const;

export type PremiumFrequency = (typeof PREMIUM_FREQUENCIES)[number];

export interface PremiumPlan {
  readonly id: string;
  readonly name: string;
  /** Minor units, per frequency. */
  readonly amounts: Readonly<Record<PremiumFrequency, number>>;
}

/**
 * The plans, in the order the pricing page renders them.
 *
 * The position **is** the identifier the application already uses:
 * `components/payment.vue` links to `/premium/register/${index}/${frequency}/`,
 * so the tier arrives as an array index. That URL contract predates this change
 * and is preserved; `id` carries the stable name alongside it.
 */
export const PREMIUM_PLANS: readonly PremiumPlan[] = [
  {
    id: "plan-basic",
    name: "Basic Access",
    amounts: { monthly: 1900, annually: 19900 },
  },
  {
    id: "plan-pro",
    name: "Pro Access",
    amounts: { monthly: 4900, annually: 49900 },
  },
  {
    id: "plan-elite",
    name: "Elite Access",
    amounts: { monthly: 9900, annually: 99900 },
  },
];

/** A priced selection. Everything Stripe needs, decided entirely server-side. */
export interface ResolvedPremiumSelection {
  readonly tier: number;
  readonly planId: string;
  readonly planName: string;
  readonly frequency: PremiumFrequency;
  readonly currency: PremiumCurrency;
  /** Minor units. */
  readonly amount: number;
  readonly description: string;
}

export type PremiumSelectionResult =
  | { readonly ok: true; readonly selection: ResolvedPremiumSelection }
  | {
      readonly ok: false;
      readonly statusCode: 400 | 422;
      readonly message: string;
    };

const isPremiumFrequency = (value: string): value is PremiumFrequency =>
  (PREMIUM_FREQUENCIES as readonly string[]).includes(value);

const refuse = (statusCode: 400 | 422, message: string) =>
  ({ ok: false, statusCode, message }) as const;

/**
 * Price a client's plan selection, or refuse it.
 *
 * Only `tier` and `frequency` are ever read. Any other field the caller sends —
 * `amount`, `currency`, `planId` — is ignored rather than sanitised, because a
 * value that is never read cannot be smuggled past a check.
 *
 * The two refusal codes mean different things, and the distinction is kept:
 *
 *   400  the request is malformed — a tier that is not an integer, a frequency
 *        that is not a string, a body that is not an object
 *   422  the request is well formed but names something the catalogue does not
 *        price — tier 7, or a frequency of "weekly"
 *
 * Refusal messages never echo the rejected value back to the caller.
 */
export function resolvePremiumSelection(input: unknown): PremiumSelectionResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return refuse(400, "A plan selection is required.");
  }

  const { tier, frequency } = input as Record<string, unknown>;

  if (typeof tier !== "number" || !Number.isInteger(tier)) {
    return refuse(400, "A plan tier is required, as a whole number.");
  }

  if (typeof frequency !== "string") {
    return refuse(400, "A billing frequency is required.");
  }

  const plan = PREMIUM_PLANS[tier];

  if (tier < 0 || plan === undefined) {
    return refuse(422, "That plan does not exist.");
  }

  if (!isPremiumFrequency(frequency)) {
    return refuse(422, "That billing frequency is not available.");
  }

  return {
    ok: true,
    selection: {
      tier,
      planId: plan.id,
      planName: plan.name,
      frequency,
      currency: PREMIUM_CURRENCY,
      amount: plan.amounts[frequency],
      description: `Horse & Breeder ${plan.name} (${frequency})`,
    },
  };
}
