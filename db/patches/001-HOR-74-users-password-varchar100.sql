-- 001-HOR-74-users-password-varchar100.sql
--
-- Widens `users`.`password` from varchar(50) to varchar(100).
--
-- WHY
--   `hbold` restores from `_legacy/hbold_backup.sql`, which declares
--   `password varchar(50) NOT NULL DEFAULT ''` — the shape of the legacy PHP
--   application. Both the versioned Prisma schema (`prisma/schema.prisma`,
--   `@db.VarChar(100)`) and the versioned Prisma migration
--   (`prisma/migrations/20241010194110_y/migration.sql`) have always declared
--   varchar(100). The reference dump is therefore behind the accepted schema.
--
--   The application hashes with bcrypt at 10 salt rounds, which produces a
--   fixed 60-character digest. 60 > 50, so every registration is rejected by
--   the server with "The provided value for the column is too long for the
--   column's type. Column: password".
--
--   This patch reconciles the reference database with the shape the repository
--   already declares. It does not invent schema — see
--   docs/adr/ADR-011-database-capacity-drift-reconciliation.md for the boundary
--   against ADR-006, which forbids adding *absent* columns to `hbold`.
--
-- SAFETY
--   Widening a varchar can neither truncate nor reinterpret stored data. Both
--   50 and 100 sit below the 255-byte boundary where MariaDB switches from a
--   1-byte to a 2-byte length prefix, so the on-disk row format is unchanged.
--   The longest value stored at the time of writing was 25 characters.
--
--   The column's character set and collation are read from the live database
--   and re-applied verbatim, so this patch changes the width and nothing else.
--
--   `NOT NULL DEFAULT ''` is asserted rather than derived, because that is the
--   shape the versioned migration declares. The guard below refuses to run
--   against a nullable column, so the patch can never convert NULLs to ''.
--
-- IDEMPOTENT
--   Safe to run any number of times. It applies only when the column is a
--   varchar narrower than 100 and already NOT NULL. It never narrows a wider
--   column, and it is a no-op once applied.
--
-- RUN
--   docker exec -i hb-mysql \
--     mariadb -uroot -p<local-password> hbold \
--     < db/patches/001-HOR-74-users-password-varchar100.sql

SET @charset := (
  SELECT CHARACTER_SET_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'users'
    AND COLUMN_NAME  = 'password'
);

SET @collation := (
  SELECT COLLATION_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME   = 'users'
    AND COLUMN_NAME  = 'password'
);

SET @needs_widening := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA              = DATABASE()
    AND TABLE_NAME                = 'users'
    AND COLUMN_NAME               = 'password'
    AND DATA_TYPE                 = 'varchar'
    AND CHARACTER_MAXIMUM_LENGTH  < 100
    AND IS_NULLABLE               = 'NO'
);

SET @ddl := IF(
  @needs_widening = 1,
  CONCAT(
    'ALTER TABLE `users` MODIFY COLUMN `password` varchar(100)',
    ' CHARACTER SET ', @charset, ' COLLATE ', @collation,
    ' NOT NULL DEFAULT '''''
  ),
  'DO 0'
);

PREPARE hor74_widen_password FROM @ddl;
EXECUTE hor74_widen_password;
DEALLOCATE PREPARE hor74_widen_password;

-- Reports the resulting shape. Zero rows here means `users`.`password` is
-- absent and the patch did not apply — investigate the restore, do not retry.
SELECT
  COLUMN_TYPE    AS resulting_type,
  IS_NULLABLE    AS resulting_nullable,
  COLUMN_DEFAULT AS resulting_default,
  COLLATION_NAME AS resulting_collation
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME   = 'users'
  AND COLUMN_NAME  = 'password';
