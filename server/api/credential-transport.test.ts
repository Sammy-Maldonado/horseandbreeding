import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * HOR-98 — credentials never travel in a URL and never come back in a body.
 *
 * The defect this guards against: `user-by-email-pass.get.ts` read a plaintext
 * password from the query string (`getQuery`), selected the stored bcrypt hash,
 * and echoed the submitted password back in its 200 body, while its caller put
 * the password in `params:` of a GET. All of that is gone; these tests keep it
 * gone.
 *
 * Like `user.put.test.ts`, this suite asserts on the repository's own sources —
 * the one place CI can always see — so a reintroduction fails the build before
 * it can reach a running server.
 */

const repoRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
const apiDirectory = resolve(repoRoot, "server", "api");

const apiSourceFiles = () =>
  readdirSync(apiDirectory)
    .filter((file) => file.endsWith(".ts"))
    .filter((file) => !/\.(test|spec)\.ts$/.test(file));

const readApiSource = (file: string) =>
  readFileSync(join(apiDirectory, file), "utf8");

/** Recursively lists client source files under a directory. */
const clientSourceFiles = (directory: string): string[] => {
  const absolute = resolve(repoRoot, directory);
  let entries: string[];
  try {
    entries = readdirSync(absolute);
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const path = join(absolute, entry);
    if (statSync(path).isDirectory()) {
      return clientSourceFiles(join(directory, entry));
    }
    if (/\.(test|spec)\.ts$/.test(entry)) {
      // Tests are guards over call sites, not call sites — several of them
      // (this one included) must name the deleted endpoint to keep it dead.
      return [];
    }
    return /\.(vue|js|ts)$/.test(entry) ? [path] : [];
  });
};

const CLIENT_DIRECTORIES = [
  "pages",
  "components",
  "composables",
  "assets/js",
  "plugins",
  "stores"
];

describe("server routes and credentials", () => {
  it("keeps the GET credential endpoint deleted", () => {
    // Complete removal was the accepted outcome — no POST replacement, no
    // deprecated alias. A file reappearing under this name is a regression.
    const revived = apiSourceFiles().filter((file) =>
      file.startsWith("user-by-email-pass")
    );

    expect(revived).toEqual([]);
  });

  it("keeps the legacy non-atomic registration endpoint deleted", () => {
    // `user.post.ts` duplicated `sign-up.post.ts` without its atomicity and had
    // no caller. Registration converges on sign-up and the wizard's PUT.
    expect(apiSourceFiles()).not.toContain("user.post.ts");
  });

  it("never reads a password from the query string", () => {
    // A route may use `getQuery` (vendor does) and a route may handle passwords
    // (login does) — but no route may do both. A query string is written to
    // access logs, proxies, browser history and Referer headers.
    const offenders = apiSourceFiles().filter((file) => {
      const source = readApiSource(file);
      return source.includes("getQuery(") && /password/i.test(source);
    });

    expect(offenders).toEqual([]);
  });

  it("only lets the login boundary select the password column", () => {
    // `login.post.ts` needs the stored hash for `bcrypt.compare`, strictly
    // locally. Every other handler must not ask Prisma for it explicitly.
    const allowed = new Set(["login.post.ts"]);
    const offenders = apiSourceFiles().filter(
      (file) =>
        !allowed.has(file) && /password:\s*true/.test(readApiSource(file))
    );

    expect(offenders).toEqual([]);
  });

  it("never echoes a submitted password back in a response", () => {
    // The exact shape the deleted endpoint used: `password: password` spread
    // into a returned body.
    const offenders = apiSourceFiles().filter((file) =>
      /password:\s*password/.test(readApiSource(file))
    );

    expect(offenders).toEqual([]);
  });
});

describe("client call sites and credentials", () => {
  it("sends no password in URL params anywhere in the client bundle", () => {
    // `params:` on a $fetch/useFetch GET serialises into the query string —
    // the transport this issue removed.
    const offenders = CLIENT_DIRECTORIES.flatMap(clientSourceFiles).filter(
      (path) => {
        const source = readFileSync(path, "utf8");
        return /params:\s*\{[^}]*password/is.test(source);
      }
    );

    expect(offenders).toEqual([]);
  });

  it("no longer references the deleted credential endpoint", () => {
    const offenders = CLIENT_DIRECTORIES.flatMap(clientSourceFiles).filter(
      (path) => readFileSync(path, "utf8").includes("user-by-email-pass")
    );

    expect(offenders).toEqual([]);
  });
});
