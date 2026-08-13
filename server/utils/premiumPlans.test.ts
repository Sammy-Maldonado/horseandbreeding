import { describe, expect, it } from "vitest";

import {
  PREMIUM_CURRENCY,
  PREMIUM_PLANS,
  resolvePremiumSelection,
} from "./premiumPlans";

/**
 * These tests exist for one reason: the browser must not be able to decide what
 * Stripe charges.
 *
 * Before HOR-72 the payment route read `amount` and `currency` straight from the
 * request body, so anyone could post `{ amount: 1 }` and receive a usable
 * `client_secret` for one cent. The catalogue below is now the only place a
 * price comes from, and `resolvePremiumSelection` is the only way to reach it.
 *
 * Every assertion here is therefore a statement about money, not about shape.
 */

/** The six real combinations the pricing page can produce, in minor units. */
const EXPECTED_AMOUNTS = [
  { tier: 0, frequency: "monthly", amount: 1900 },
  { tier: 0, frequency: "annually", amount: 19900 },
  { tier: 1, frequency: "monthly", amount: 4900 },
  { tier: 1, frequency: "annually", amount: 49900 },
  { tier: 2, frequency: "monthly", amount: 9900 },
  { tier: 2, frequency: "annually", amount: 99900 },
] as const;

describe("PREMIUM_PLANS catalogue", () => {
  it("holds exactly the three tiers the pricing page offers", () => {
    expect(PREMIUM_PLANS).toHaveLength(3);
  });

  it("identifies each tier with the id the pricing page already uses", () => {
    expect(PREMIUM_PLANS.map((plan) => plan.id)).toEqual([
      "plan-basic",
      "plan-pro",
      "plan-elite",
    ]);
  });

  it("prices every plan in positive integer minor units", () => {
    for (const plan of PREMIUM_PLANS) {
      for (const amount of Object.values(plan.amounts)) {
        expect(Number.isInteger(amount)).toBe(true);
        expect(amount).toBeGreaterThan(0);
      }
    }
  });

  it("charges in euros", () => {
    expect(PREMIUM_CURRENCY).toBe("eur");
  });
});

describe("resolvePremiumSelection — the amounts actually charged", () => {
  it.each(EXPECTED_AMOUNTS)(
    "resolves tier $tier $frequency to $amount",
    ({ tier, frequency, amount }) => {
      const result = resolvePremiumSelection({ tier, frequency });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.selection.amount).toBe(amount);
      expect(result.selection.currency).toBe("eur");
      expect(result.selection.tier).toBe(tier);
      expect(result.selection.frequency).toBe(frequency);
    }
  );

  it("names the plan it resolved, so the charge is attributable", () => {
    const result = resolvePremiumSelection({ tier: 1, frequency: "monthly" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.selection.planId).toBe("plan-pro");
    expect(result.selection.planName).toBe("Pro Access");
    expect(result.selection.description).toContain("Pro Access");
  });
});

describe("resolvePremiumSelection — a client cannot influence the amount", () => {
  it("ignores an amount supplied by the client", () => {
    const result = resolvePremiumSelection({
      tier: 0,
      frequency: "monthly",
      amount: 1,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.selection.amount).toBe(1900);
  });

  it("ignores a currency supplied by the client", () => {
    const result = resolvePremiumSelection({
      tier: 0,
      frequency: "monthly",
      currency: "usd",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.selection.currency).toBe("eur");
  });

  it("ignores a client attempt to rename the plan it is buying", () => {
    const result = resolvePremiumSelection({
      tier: 0,
      frequency: "monthly",
      planId: "plan-elite",
      planName: "Elite Access",
      description: "free",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.selection.planId).toBe("plan-basic");
    expect(result.selection.amount).toBe(1900);
  });

  it("never returns an amount that is absent from the catalogue", () => {
    const catalogued = new Set(
      PREMIUM_PLANS.flatMap((plan) => Object.values(plan.amounts))
    );

    for (const { tier, frequency } of EXPECTED_AMOUNTS) {
      const result = resolvePremiumSelection({ tier, frequency });

      expect(result.ok).toBe(true);
      if (!result.ok) continue;

      expect(catalogued.has(result.selection.amount)).toBe(true);
    }
  });
});

describe("resolvePremiumSelection — malformed requests are refused with 400", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["a string", "tier=0"],
    ["a number", 0],
    ["an array", [0, "monthly"]],
  ])("refuses %s as a request body", (_label, input) => {
    const result = resolvePremiumSelection(input);

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.statusCode).toBe(400);
  });

  it.each([
    ["a numeric string", "1"],
    ["a fractional number", 1.5],
    ["NaN", Number.NaN],
    ["null", null],
    ["a boolean", true],
    ["missing", undefined],
  ])("refuses %s as a tier", (_label, tier) => {
    const result = resolvePremiumSelection({ tier, frequency: "monthly" });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.statusCode).toBe(400);
  });

  it.each([
    ["a number", 0],
    ["null", null],
    ["missing", undefined],
  ])("refuses %s as a frequency", (_label, frequency) => {
    const result = resolvePremiumSelection({ tier: 0, frequency });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.statusCode).toBe(400);
  });
});

describe("resolvePremiumSelection — valid shapes with invalid values are refused with 422", () => {
  it.each([-1, 3, 99])("refuses tier %i, which no plan occupies", (tier) => {
    const result = resolvePremiumSelection({ tier, frequency: "monthly" });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.statusCode).toBe(422);
  });

  it.each(["weekly", "yearly", "", "MONTHLY"])(
    "refuses frequency %j, which the catalogue does not price",
    (frequency) => {
      const result = resolvePremiumSelection({ tier: 0, frequency });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.statusCode).toBe(422);
    }
  );

  it("refuses the capitalised frequency the payment component used to default to", () => {
    // `StripePeyment.vue` declared `subscriptionType` with a default of
    // "Monthly" while every price key is lower case. It never surfaced because
    // the route always supplied the lower-case value. Refusing it loudly is the
    // point: an unpriced selection must not reach Stripe.
    const result = resolvePremiumSelection({
      tier: 0,
      frequency: "Monthly",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.statusCode).toBe(422);
  });

  it("explains the refusal without echoing the rejected value back", () => {
    const result = resolvePremiumSelection({
      tier: 0,
      frequency: "<script>alert(1)</script>",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.message).not.toContain("<script>");
  });
});
