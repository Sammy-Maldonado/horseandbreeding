import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import RecursiveCompetitionHistory from "./RecursiveCompetitionHistory.vue";

/**
 * Nuxt-environment smoke test for the maternal-line renderer.
 *
 * It exercises the two branches of the component's template — the empty state
 * and a rendered line — through the real Nuxt runtime (auto-imports and the
 * `HorseFamilyTree` component resolution are why this runs in the Nuxt
 * project, not the plain Node one).
 *
 * `HorseFamilyTree` is stubbed so the assertions describe THIS component's
 * behaviour, not its child's, and never touch the database.
 */

const familyTreeStub = {
  HorseFamilyTree: { template: '<div class="horse-family-tree-stub" />' },
};

// One dam in the maternal line. `genealogyTree` walks `dam`, appends the
// terminal node, and the template renders every entry but the last — so a
// single-dam line renders exactly one `HorseFamilyTree`.
const singleDamLine = [
  {
    horse_id: 1,
    name: "TEST MARE",
    birthyear: 2005,
    sire: { name: "TEST SIRE" },
    dam: { horse_id: 2 },
  },
];

describe("RecursiveCompetitionHistory", () => {
  it("shows the empty-state message when no horses are provided", async () => {
    const wrapper = await mountSuspended(RecursiveCompetitionHistory);

    expect(wrapper.text()).toContain("no data in recursive-competition-history");
    expect(wrapper.find(".horse-family-tree-stub").exists()).toBe(false);
  });

  it("renders one family-tree node for a single-dam maternal line", async () => {
    const wrapper = await mountSuspended(RecursiveCompetitionHistory, {
      props: { horses: singleDamLine },
      global: { stubs: familyTreeStub },
    });

    expect(wrapper.text()).not.toContain(
      "no data in recursive-competition-history"
    );
    expect(wrapper.findAll(".horse-family-tree-stub")).toHaveLength(1);
  });
});
