import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * HOR-119 — Defect A: the dead `error` state owned by `fetchHorse`.
 *
 * `pages/report.vue` declares `const error = ref(null)`, resets it at the top
 * of `fetchHorse` and assigns the caught exception to it in the `catch` block.
 * Nothing ever reads it: the template never mentions it, no child component
 * receives it, the page exposes nothing, and no watcher or computed depends on
 * it. The user-facing failure story is carried entirely by `message` and
 * `isError`, which `AppMessage` renders.
 *
 * A ref that is only ever written is not error handling — it is a promise the
 * page does not keep. It reads as though failures are surfaced when they are
 * not, and it hides the fact that a thrown lookup tells the user nothing.
 *
 * These tests run the page's own `fetchHorse` source rather than a copy of it,
 * so they describe the real function. They assert two different things:
 *
 *   - the deletion basis: no path ever *reads* the `error` state, which is why
 *     removing it cannot change behaviour. This holds before and after.
 *   - the deletion itself: the exact ordered set of state each path writes.
 *     This fails while the dead writes are still there.
 *
 * `pending` is deliberately not touched. HOR-118 corrected an earlier note and
 * established that `pending` IS rendered (it disables the Search button and
 * swaps its label), so it is live state and is asserted here as a preserved
 * contract.
 *
 * No database, no network, no Nuxt runtime.
 */

const BLOCK_START = "async function fetchHorse() {";
const BLOCK_END = "const pedigrees = ref([]);";

function readFetchHorseSource(): string {
  const file = join(dirname(fileURLToPath(import.meta.url)), "report.vue");
  const source = readFileSync(file, "utf8");

  const from = source.indexOf(BLOCK_START);
  const to = source.indexOf(BLOCK_END, from);
  if (from === -1 || to <= from) {
    throw new Error("fetchHorse block not found in report.vue");
  }

  return source
    .slice(from, to)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

interface Write {
  name: string;
  value: unknown;
}

interface Journal {
  reads: string[];
  writes: Write[];
}

function trackedRef(name: string, initial: unknown, journal: Journal) {
  let inner = initial;
  return {
    get value(): unknown {
      journal.reads.push(name);
      return inner;
    },
    set value(next: unknown) {
      journal.writes.push({ name, value: next });
      inner = next;
    },
  };
}

type Responder = (url: string, options: unknown) => unknown;

async function runFetchHorse(respond: Responder) {
  const journal: Journal = { reads: [], writes: [] };

  const state = {
    pending: trackedRef("pending", false, journal),
    error: trackedRef("error", null, journal),
    message: trackedRef("message", "", journal),
    isError: trackedRef("isError", -1, journal),
    _competitionHistory: trackedRef("_competitionHistory", [], journal),
    search: trackedRef("search", "59295", journal),
  };

  const calls = {
    fetchPedigree: 0,
    openModal: 0,
    deferred: [] as Array<() => void>,
    logs: [] as unknown[][],
  };

  const factory = new Function(
    "state",
    "calls",
    "fetchWithToken",
    "console",
    "setTimeout",
    [
      '"use strict";',
      "const { pending, error, message, isError, _competitionHistory, search } = state;",
      "const fetchPedigree = () => { calls.fetchPedigree += 1; };",
      "const openModal = () => { calls.openModal += 1; };",
      readFetchHorseSource(),
      "return fetchHorse;",
    ].join("\n"),
  );

  const fetchHorse = factory(
    state,
    calls,
    respond,
    {
      log: (...args: unknown[]) => calls.logs.push(args),
      error: (...args: unknown[]) => calls.logs.push(args),
    },
    (callback: () => void) => {
      calls.deferred.push(callback);
      return 0;
    },
  ) as () => Promise<void>;

  await fetchHorse();

  return {
    calls,
    journal,
    reads: journal.reads,
    writes: journal.writes,
    written: journal.writes.map((write) => write.name),
  };
}

const respondWith = (
  status: number,
  body: Record<string, unknown>,
): Responder => {
  return () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
};

const succeeds = respondWith(200, {
  statusCode: 200,
  statusMessage: "Successful..!",
  body: JSON.stringify([{ horse_id: 1003, name: "ERNE ALERT" }]),
});

const rejectsUnauthenticated = respondWith(401, {
  statusCode: 401,
  statusMessage: "Unauthorized",
});

const refuses = respondWith(422, {
  statusCode: 422,
  statusMessage: "Horse identifier is not valid.",
});

const throws: Responder = () => {
  throw new Error("network is down");
};

describe("report page — the error state fetchHorse owns", () => {
  it("is never read on any path, which is why removing it changes nothing", async () => {
    const paths = [succeeds, rejectsUnauthenticated, refuses, throws];

    for (const respond of paths) {
      const { reads } = await runFetchHorse(respond);

      // The deletion basis. If any path ever consumed this state, the value
      // would have to be preserved instead of removed.
      expect(reads.filter((name) => name === "error")).toEqual([]);
    }
  });

  it("writes only state the page actually renders when the lookup succeeds", async () => {
    const { written } = await runFetchHorse(succeeds);

    expect(written).toEqual([
      "pending",
      "_competitionHistory",
      "message",
      "_competitionHistory",
      "isError",
      "pending",
    ]);
  });

  it("writes only state the page actually renders when the lookup throws", async () => {
    const { written, calls } = await runFetchHorse(throws);

    expect(written).toEqual(["pending", "_competitionHistory", "pending"]);

    // The diagnostic stays: a thrown lookup is still reported to the console.
    expect(calls.logs).toHaveLength(1);
    expect(calls.logs[0]?.[0]).toBe("Error horse competition history");
    expect((calls.logs[0]?.[1] as Error).message).toBe("network is down");
  });
});

describe("report page — contracts fetchHorse must keep", () => {
  it("raises pending for the whole lookup and lowers it afterwards", async () => {
    const successful = await runFetchHorse(succeeds);
    const thrown = await runFetchHorse(throws);

    for (const run of [successful, thrown]) {
      const pending = run.writes.filter((write) => write.name === "pending");

      expect(pending.map((write) => write.value)).toEqual([true, false]);
    }
  });

  it("still tells the user a successful lookup succeeded", async () => {
    const { writes } = await runFetchHorse(succeeds);

    const message = writes.find((write) => write.name === "message");
    const isError = writes.filter((write) => write.name === "isError");

    expect(message?.value).toBe("Successful..!");
    expect(isError.map((write) => write.value)).toEqual([0]);
  });

  it("still explains a signed-out lookup and reopens the sign-in modal", async () => {
    const { writes, calls } = await runFetchHorse(rejectsUnauthenticated);

    const message = writes.find((write) => write.name === "message");
    const isError = writes.find((write) => write.name === "isError");

    expect(String(message?.value)).toContain("not logged in");
    expect(isError?.value).toBe(1);

    expect(calls.deferred).toHaveLength(1);
    calls.deferred[0]?.();
    expect(calls.openModal).toBe(1);
  });

  it("still surfaces the server's own reason when the lookup is refused", async () => {
    const { writes } = await runFetchHorse(refuses);

    const message = writes.find((write) => write.name === "message");
    const isError = writes.find((write) => write.name === "isError");

    expect(message?.value).toBe("Horse identifier is not valid.");
    expect(isError?.value).toBe(1);
  });

  it("still clears the previous competition history before each lookup", async () => {
    const { writes } = await runFetchHorse(succeeds);

    const history = writes.filter(
      (write) => write.name === "_competitionHistory",
    );

    expect(history[0]?.value).toEqual([]);
    expect(history[1]?.value).toEqual([{ horse_id: 1003, name: "ERNE ALERT" }]);
  });

  it("still starts the pedigree lookup alongside the competition history", async () => {
    const { calls } = await runFetchHorse(succeeds);

    expect(calls.fetchPedigree).toBe(1);
  });
});
