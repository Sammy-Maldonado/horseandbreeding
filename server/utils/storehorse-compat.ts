/**
 * Single owner of the `storehorse.status` active-horse semantics.
 *
 * Model: `1` means the horse is active and visible to the pedigree pipeline
 * (the default, and the state of every historical row); `-1` means a
 * marketplace listing created by the public sell form; NULL is not a valid
 * state — the `*_storehorse_status_active_backfill` migration backfilled the
 * historical rows and hardened the column to `NOT NULL DEFAULT 1`.
 *
 * The runtime capability probe that once suppressed the filter on databases
 * without the column (ADR-006) is retired: every database in the supported
 * rebuild path carries the column, so the branch it guarded no longer
 * describes any real environment. See ADR-014.
 */

/** Value the application uses to mean "this horse is active". */
export const ACTIVE_HORSE_STATUS = 1;

/**
 * Builds the "active horse" fragment of a `storehorse` where clause.
 * Spread it into a where object alongside sibling conditions.
 */
export function activeHorseFilter(): { status: number } {
  return { status: ACTIVE_HORSE_STATUS };
}

/**
 * Builds the `status` fragment of a `storehorse` projection.
 * Spread it into a select object.
 */
export function horseStatusSelect(): { status: true } {
  return { status: true };
}
