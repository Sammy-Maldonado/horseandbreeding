-- HOR-79: Convert `users` from MyISAM to InnoDB (ADR-012).
-- This is the ONLY engine conversion in this wave: `users` is the parent of
-- every modern authentication foreign key, and InnoDB is required on both
-- sides of a real constraint. Other MyISAM tables are retired progressively
-- in later waves.
-- Charset/collation are deliberately untouched (engine wave and charset wave
-- are never combined). Data fidelity is proven procedurally: row count, id
-- range, AUTO_INCREMENT, CHECKSUM TABLE EXTENDED and a content fingerprint
-- are captured before and after in the migration evidence.
ALTER TABLE `users` ENGINE = InnoDB;
