-- HOR-76: Modern authentication sessions (ADR-013).
-- Curated from `prisma migrate diff` following the ADR-012 curation policy:
-- only the authorised authentication changes are included.
--
-- What this migration does:
--   * Drops `access_tokens`. Access tokens are short-lived stateless JWTs
--     with a unique `jti` and are never persisted. The table was write-only
--     (no reader anywhere in the repository), held zero rows, and its
--     revocation/audit responsibility is replaced by the short TTL plus
--     rotating refresh sessions. Evidence: ADR-013 and Linear HOR-76.
--   * Removes `refresh_tokens.client_id` and its FK to the OAuth `clients`
--     registry. The modern refresh session belongs to the user alone
--     (`user_id` -> `users.id`); `clients` has no rows and no consumer, and
--     no OAuth credential will be fabricated to satisfy an unused FK.
--
-- Deliberately EXCLUDED from the generated diff (same evidence as HOR-79's
-- foundation migration — these remain owned by their own issues/waves):
--   * `storehorse.height` widening — owned by HOR-82.
--   * Composite primary keys on `storehorse_has_approvedby` and
--     `studbook_has_storehorse` — require a business-data deduplication
--     decision first.
--   * Every foreign key with a MyISAM table on either side — they follow the
--     future engine waves.

-- DropForeignKey
ALTER TABLE `access_tokens` DROP FOREIGN KEY `access_tokens_client_id_fkey`;

-- DropForeignKey
ALTER TABLE `access_tokens` DROP FOREIGN KEY `access_tokens_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `refresh_tokens_client_id_fkey`;

-- DropIndex (the FK above left its supporting index behind)
DROP INDEX `refresh_tokens_client_id_fkey` ON `refresh_tokens`;

-- AlterTable
ALTER TABLE `refresh_tokens` DROP COLUMN `client_id`;

-- DropTable (zero rows measured; see the safe-deletion evidence in HOR-76)
DROP TABLE `access_tokens`;
