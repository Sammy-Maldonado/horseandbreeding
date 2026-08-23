import { describe, expect, it } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import HorseSearchPagination from "./HorseSearchPagination.vue";

/**
 * HOR-119 — Defect B, seen from the links a visitor actually clicks.
 *
 * `HorseSearchPagination` builds its Next link with `Math.min(page + 1, total)`.
 * Given a real number that is correct. Given the string the URL carries, `+`
 * concatenates instead of adding, and the result is then clamped:
 *
 *     page "1"  ->  "11"  ->  Math.min(11, 20)  ->  page 11
 *     page "2"  ->  "21"  ->  Math.min(21, 20)  ->  page 20  (the last page)
 *     page "9"  ->  "91"  ->  Math.min(91, 20)  ->  page 20  (the last page)
 *
 * So the defect is not only "page 1 jumps to page 11". From page 2 onwards,
 * Next collapses to the *last* page every time: forward navigation through the
 * result list is broken everywhere except the first page, which merely lands
 * somewhere wrong instead.
 *
 * These tests mount the real component and feed it the value the real route
 * page produces, read from that page's own source. Nothing here is a copy or a
 * stand-in, so a green run means the links a visitor sees are right.
 *
 * They also pin what must NOT change: Previous, the clamp at the last page, the
 * highlighted page, and the shortened page list with its ellipses.
 */

const PAGE_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "pages",
  "search",
  "[texts]",
  "[page].vue",
);

/** What the route page hands this component for a given URL segment. */
function currentPageFor(segment: string): unknown {
  const line = readFileSync(PAGE_FILE, "utf8")
    .split("\n")
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.startsWith("const currentPage = ref("));

  if (!line) {
    throw new Error("currentPage declaration not found in [page].vue");
  }

  const expression = line
    .replace(/\s*\/\/.*$/, "")
    .replace(/^const currentPage = ref\(/, "")
    .replace(/\);$/, "");

  const read = new Function(
    "route",
    `"use strict"; return (${expression});`,
  ) as (route: { params: Record<string, string> }) => unknown;

  return read({ params: { page: segment, texts: "erne" } });
}

async function renderFor(segment: string, total: number) {
  const wrapper = await mountSuspended(HorseSearchPagination, {
    props: { total, page: currentPageFor(segment), texts: "erne" },
  });

  const links = wrapper.findAll("a");
  const labelled = (word: string) =>
    links.find((link) => link.text().includes(word));

  return {
    wrapper,
    next: labelled("Next")?.attributes("href"),
    previous: labelled("Previous")?.attributes("href"),
    pages: links
      .filter((link) => !/Next|Previous/.test(link.text()))
      .map((link) => ({
        label: link.text().trim(),
        href: link.attributes("href"),
        active: (link.attributes("class") ?? "").includes("border-indigo-500"),
      })),
    ellipses: wrapper
      .findAll("span")
      .filter((span) => span.text().trim() === "...").length,
  };
}

describe("search pagination — moving forward", () => {
  it("sends Next from the first page to the second page", async () => {
    const { next } = await renderFor("1", 20);

    expect(next).toBe("/search/erne/2");
  });

  it("advances by exactly one page from anywhere in the list", async () => {
    expect((await renderFor("2", 20)).next).toBe("/search/erne/3");
    expect((await renderFor("9", 20)).next).toBe("/search/erne/10");
    expect((await renderFor("10", 20)).next).toBe("/search/erne/11");
    expect((await renderFor("19", 20)).next).toBe("/search/erne/20");
  });

  it("advances by one page in a short result list too", async () => {
    expect((await renderFor("1", 3)).next).toBe("/search/erne/2");
    expect((await renderFor("2", 3)).next).toBe("/search/erne/3");
  });

  it("never goes past the last page", async () => {
    expect((await renderFor("20", 20)).next).toBe("/search/erne/20");
    expect((await renderFor("3", 3)).next).toBe("/search/erne/3");
  });
});

describe("search pagination — moving back", () => {
  it("goes back exactly one page", async () => {
    expect((await renderFor("10", 20)).previous).toBe("/search/erne/9");
    expect((await renderFor("2", 20)).previous).toBe("/search/erne/1");
  });

  it("never goes before the first page", async () => {
    expect((await renderFor("1", 20)).previous).toBe("/search/erne/1");
    expect((await renderFor("1", 3)).previous).toBe("/search/erne/1");
  });
});

describe("search pagination — the page list itself", () => {
  it("highlights the page the URL asked for", async () => {
    const { pages } = await renderFor("9", 20);

    const active = pages.filter((page) => page.active);

    expect(active).toHaveLength(1);
    expect(active[0]?.label).toBe("9");
  });

  it("highlights the first page when the URL asked for the first page", async () => {
    const { pages } = await renderFor("1", 20);

    const active = pages.filter((page) => page.active);

    expect(active).toHaveLength(1);
    expect(active[0]?.label).toBe("1");
  });

  it("shortens a long list around the current page with two ellipses", async () => {
    const { pages, ellipses } = await renderFor("9", 20);

    expect(pages.map((page) => page.label)).toEqual([
      "1",
      "2",
      "9",
      "19",
      "20",
    ]);
    expect(ellipses).toBe(2);
  });

  it("lists every page of a short result list with no ellipsis", async () => {
    const { pages, ellipses } = await renderFor("1", 3);

    expect(pages.map((page) => page.label)).toEqual(["1", "2", "3"]);
    expect(ellipses).toBe(0);
  });

  it("links each listed page to its own route", async () => {
    const { pages } = await renderFor("9", 20);

    for (const page of pages) {
      expect(page.href).toBe(`/search/erne/${page.label}`);
    }
  });
});
