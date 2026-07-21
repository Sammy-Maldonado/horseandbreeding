/**
 * Compatibility layer for `storehorse.status`.
 *
 * The application schema declares `storehorse.status`, but the legacy `hbold`
 * reference database has never contained that column: it belongs to a
 * marketplace feature set the previous developer built in code and never
 * shipped to this dataset. Queries that filter on it fail outright against
 * `hbold`.
 *
 * The column is NOT removed from the schema and NOT added to the database.
 * See ADR-006 and docs/data/hbold-baseline.md.
 */

/** Value the application uses to mean "this horse is active". */
export const ACTIVE_HORSE_STATUS = 1;

/**
 * Builds the `status` fragment of a `storehorse` projection.
 *
 * Spread it into a select object. When the column is unavailable this
 * contributes nothing, so the projection names only columns that exist.
 */
export function horseStatusSelect(
  supportsStatus: boolean
): { status?: true } {
  return supportsStatus ? { status: true } : {};
}

/** The narrowest client surface the detector needs. */
export interface StatusProbeClient {
  $queryRaw: (
    query: TemplateStringsArray,
    ...values: unknown[]
  ) => Promise<unknown>;
}

/**
 * Builds the "active horse" fragment of a `storehorse` where clause.
 *
 * Spread it into a where object. When the column is unavailable this
 * contributes nothing, leaving sibling conditions untouched rather than
 * narrowing the result set.
 */
export function activeHorseFilter(
  supportsStatus: boolean
): { status?: number } {
  return supportsStatus ? { status: ACTIVE_HORSE_STATUS } : {};
}

/**
 * Asks the connected database whether `storehorse.status` exists.
 *
 * Errors propagate deliberately: a failed probe means the database could not
 * be reached, and guessing would silently leave every query unfiltered.
 */
export async function detectStorehorseStatusColumn(
  client: StatusProbeClient
): Promise<boolean> {
  const rows = (await client.$queryRaw`
    SELECT COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'storehorse'
      AND COLUMN_NAME = 'status'
    LIMIT 1
  `) as unknown[];

  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Cached probe result. Holds the in-flight promise so concurrent callers share
 * one query, and is cleared on failure so a transient outage can recover.
 */
let statusSupport: Promise<boolean> | null = null;

/**
 * Resolves — once per process — whether the connected database supports
 * `storehorse.status`.
 */
export function storehorseSupportsStatus(
  client: StatusProbeClient
): Promise<boolean> {
  if (!statusSupport) {
    statusSupport = detectStorehorseStatusColumn(client).catch((error) => {
      statusSupport = null;
      throw error;
    });
  }

  return statusSupport;
}

/** Clears the cached probe result. Intended for tests. */
export function resetStorehorseStatusCache(): void {
  statusSupport = null;
}
