import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * HOR-99. A status or error message is data, not HTML. Before this issue several
 * handlers built a message by interpolating the caller's own input into a string
 * that already carried `<b>` tags — `Invalid email <b>${email}</b> format.` —
 * and the frontend sink rendered it as markup. Whatever the caller sent arrived
 * at the client inside a fragment intended for rendering, with no encoding step
 * between input and output: an XSS path.
 *
 * The frontend sink is fixed to render text (`components/AppMessage.nuxt.test.ts`
 * guards that). This test guards the other half of the contract: no handler ever
 * puts presentation HTML into a message string in the first place. It scans the
 * whole `server/api` surface — including handlers added later — so the deleted
 * `user-by-email-pass.get.ts` pattern (HOR-98) cannot quietly reappear elsewhere.
 *
 * It sits in `server/utils` rather than `server/api` for the same reason
 * `truthfulHttpStatus.test.ts` does: Nitro registers every file under
 * `server/api` as a route, and a test file is not a route. It touches no
 * database.
 */

const apiDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "api"
);

const handlerFiles = readdirSync(apiDirectory, { recursive: true })
  .map((entry) => String(entry))
  .filter((file) => file.endsWith(".ts"))
  .filter((file) => !/\.(test|spec)\.ts$/.test(file))
  .sort();

const sourceOf = (file: string) => readFileSync(join(apiDirectory, file), "utf8");

/**
 * Every string literal assigned to a `statusMessage` or `message` key/variable —
 * template literal, double- or single-quoted. Template literals are matched
 * greedily up to their closing backtick, so an interpolation like `${email}` is
 * captured with its surrounding text. A backtick never appears inside these
 * strings, so `[^`]*` is a safe body.
 */
const MESSAGE_STRING =
  /(?:statusMessage|message)\s*[:=]\s*(`[^`]*`|"[^"]*"|'[^']*')/g;

/**
 * An HTML presentation tag. Named tags only, so TypeScript generics
 * (`Promise<void>`, `Map<string, number>`) and comparisons are never mistaken
 * for markup.
 */
const HTML_TAG =
  /<\/?(?:b|strong|i|em|br|span|div|a|p|img|script|ul|ol|li|table|tr|td|h[1-6])(?:\s|\/?>)/i;

describe("status messages carry no presentation HTML", () => {
  it("finds the handlers it is meant to protect", () => {
    expect(handlerFiles.length).toBeGreaterThan(30);
  });

  it("never interpolates or embeds HTML tags in a status/error message", () => {
    for (const file of handlerFiles) {
      for (const [, literal] of sourceOf(file).matchAll(MESSAGE_STRING)) {
        // The message is delivered to a client and shown to a human. A tag in it
        // is either dead markup or, when the string interpolates caller input,
        // an injection sink. Neither belongs in a plain-text message contract.
        expect(`${file}: ${literal}`).not.toMatch(HTML_TAG);
      }
    }
  });
});
