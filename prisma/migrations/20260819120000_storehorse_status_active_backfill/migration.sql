-- Reconcile `storehorse.status` semantics (HOR-94).
--
-- `20260815092730_modernise_auth_foundation` added `status INTEGER NULL` with
-- no backfill, so on a migrated legacy restore every historical row held NULL
-- and the application's `status = 1` active filter excluded all of them —
-- search, pagination and pedigree returned nothing and the maternal-line
-- endpoints failed. The legacy application had no horse-status concept: every
-- historical horse was visible, so every legacy row is active.
--
-- Reconciled model: 1 = active horse (default), -1 = marketplace listing
-- created by the public sell form, NULL = no longer a valid state.
--
-- The UPDATE must run before the MODIFY: removing nullability while NULL rows
-- remain would fail in strict mode or silently coerce NULL to 0 otherwise,
-- and 0 has no meaning in this model.

UPDATE `storehorse`
SET `status` = 1
WHERE `status` IS NULL;

ALTER TABLE `storehorse`
    MODIFY `status` INTEGER NOT NULL DEFAULT 1;
