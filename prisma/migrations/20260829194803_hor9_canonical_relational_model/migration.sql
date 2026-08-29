-- HOR-9: Canonical relational model around storehorse (ADR-018, ADR-005, ADR-017).
-- Curated from `prisma migrate diff --from-config-datasource --to-schema`
-- against the local hbold restore. Strictly ADDITIVE: no table or column is
-- dropped, renamed or modified; `storehorse` is not touched (it remains the
-- single canonical horse registry — every new table points at
-- `storehorse.horse_id`, none of them is a second horse table and none of
-- them duplicates the `sire_id`/`dam_id` pedigree chain).
--
-- Deliberately EXCLUDED from the generated diff (evidence in Linear HOR-9):
--   * The four new relations towards `storehorse` — `canonical_writeup.horse_id`,
--     `source_assertion.horse_id`, `source_assertion.related_horse_id` and
--     `canonical_change_audit.horse_id`. `storehorse` is still MyISAM, so an
--     InnoDB child cannot hold a FOREIGN KEY to it (errno 150). They join the
--     ADR-012 deferral list next to `competition_history.storehorse_id` and
--     are enforced by the application until the storehorse engine wave.
--   * The pre-existing ADR-012 deferrals (every MyISAM-side foreign key and
--     the composite primary keys on `storehorse_has_approvedby` /
--     `studbook_has_storehorse`, whose duplicate pairs need a business
--     decision) — they belong to their own issues, not to HOR-9.
--   * `storehorse.dam_id` nullability drift — tracked in its own issue.
--
-- `competition_history` is a latin1 legacy table: the new free-text columns
-- are declared utf8mb4 explicitly so that catalogue text is never truncated
-- or transliterated on the way in. Every new column is NULL for the 454
-- pre-existing rows, which are kept exactly as they are.

-- AlterTable (additive, nullable; NULL = legacy row)
ALTER TABLE `competition_history` ADD COLUMN `canonicalisation_state` ENUM('CANONICALISED_STRUCTURED', 'CANONICALISED_RELATIONSHIP', 'PRESERVED_SOURCE_FACT', 'AMBIGUOUS', 'CONFLICT', 'EXPLICITLY_UNSUPPORTED', 'ERROR') NULL,
    ADD COLUMN `country_code` VARCHAR(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    ADD COLUMN `discipline_code` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    ADD COLUMN `event_name` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    ADD COLUMN `ingestion_run_id` INTEGER NULL,
    ADD COLUMN `level_code` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    ADD COLUMN `participation` ENUM('INDIVIDUAL', 'TEAM') NULL,
    ADD COLUMN `raw_source_segment` TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
    ADD COLUMN `result_kind` ENUM('PLACED', 'WON', 'COMPETED') NULL;

-- CreateTable
CREATE TABLE `source_document` (
    `source_document_id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_key` VARCHAR(64) NOT NULL,
    `content_fingerprint` CHAR(64) NOT NULL,
    `document_type` ENUM('WORD_CATALOGUE', 'EXCEL_AUCTION_LIST', 'OTHER') NOT NULL,
    `catalogue_name` VARCHAR(191) NULL,
    `catalogue_year` INTEGER NULL,
    `source_reference` VARCHAR(255) NULL,
    `byte_size` INTEGER NULL,
    `notes` TEXT NULL,
    `registered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `source_document_document_key_key`(`document_key`),
    UNIQUE INDEX `source_document_content_fingerprint_key`(`content_fingerprint`),
    PRIMARY KEY (`source_document_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingestion_run` (
    `ingestion_run_id` INTEGER NOT NULL AUTO_INCREMENT,
    `run_key` VARCHAR(128) NOT NULL,
    `source_document_id` INTEGER NOT NULL,
    `extractor_version` VARCHAR(32) NOT NULL,
    `output_contract_version` VARCHAR(32) NOT NULL,
    `run_status` ENUM('STARTED', 'COMPLETED', 'FAILED', 'ABORTED') NOT NULL DEFAULT 'STARTED',
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,
    `total_source_nodes` INTEGER NULL,
    `accounted_nodes` INTEGER NULL,
    `unaccounted_nodes` INTEGER NULL,
    `accounting_summary` JSON NULL,
    `error_summary` TEXT NULL,
    `created_by` VARCHAR(100) NULL,

    UNIQUE INDEX `ingestion_run_run_key_key`(`run_key`),
    INDEX `ingestion_run_source_document_id_idx`(`source_document_id`),
    INDEX `ingestion_run_run_status_idx`(`run_status`),
    PRIMARY KEY (`ingestion_run_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `canonical_writeup` (
    `writeup_id` INTEGER NOT NULL AUTO_INCREMENT,
    `horse_id` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `content_hash` CHAR(64) NOT NULL,
    `lifecycle_state` ENUM('IMPORTED', 'APPROVED', 'CORRECTED') NOT NULL DEFAULT 'IMPORTED',
    `version` INTEGER NOT NULL DEFAULT 1,
    `source_document_id` INTEGER NULL,
    `ingestion_run_id` INTEGER NULL,
    `approved_by` VARCHAR(100) NULL,
    `approved_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `canonical_writeup_horse_id_key`(`horse_id`),
    INDEX `canonical_writeup_source_document_id_idx`(`source_document_id`),
    INDEX `canonical_writeup_ingestion_run_id_idx`(`ingestion_run_id`),
    INDEX `canonical_writeup_lifecycle_state_idx`(`lifecycle_state`),
    PRIMARY KEY (`writeup_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `source_assertion` (
    `source_assertion_id` INTEGER NOT NULL AUTO_INCREMENT,
    `assertion_key` VARCHAR(128) NOT NULL,
    `source_document_id` INTEGER NOT NULL,
    `ingestion_run_id` INTEGER NOT NULL,
    `node_id` VARCHAR(64) NOT NULL,
    `block_index` INTEGER NOT NULL,
    `lot_order` INTEGER NULL,
    `section_ordinal` INTEGER NULL,
    `section_occurrence` INTEGER NULL,
    `item_order` INTEGER NULL,
    `chain_index` INTEGER NULL,
    `segment_index` INTEGER NULL,
    `text_offset` INTEGER NULL,
    `nesting_depth` INTEGER NOT NULL DEFAULT 0,
    `assertion_kind` ENUM('SUBJECT_IDENTITY', 'BIRTH_YEAR', 'PEDIGREE_DAM', 'PEDIGREE_SIRE', 'DESCENDANT_LINK', 'MATERNAL_WRITEUP', 'COMPETITION_RESULT', 'APPROVAL', 'STUDBOOK', 'DISCIPLINE', 'SPORT_LEVEL', 'RIDER', 'COUNTRY', 'SIRE_NOTE', 'HEAD_NOTE', 'SEE_ABOVE_REFERENCE', 'FREE_TEXT', 'UNSUPPORTED_STRUCTURE', 'EXTRACTION_ERROR') NOT NULL,
    `subject_name_raw` VARCHAR(255) NULL,
    `subject_name_normalised` VARCHAR(255) NULL,
    `raw_text` TEXT NOT NULL,
    `interpreted_payload` JSON NULL,
    `persistence_state` ENUM('CANONICALISED_STRUCTURED', 'CANONICALISED_RELATIONSHIP', 'PRESERVED_SOURCE_FACT', 'AMBIGUOUS', 'CONFLICT', 'EXPLICITLY_UNSUPPORTED', 'ERROR') NOT NULL,
    `state_reason` VARCHAR(255) NULL,
    `resolution_outcome` ENUM('NOT_ATTEMPTED', 'EXISTING_HORSE', 'NEW_HORSE', 'AMBIGUOUS', 'CONFLICT') NOT NULL DEFAULT 'NOT_ATTEMPTED',
    `horse_id` INTEGER NULL,
    `related_horse_id` INTEGER NULL,
    `writeup_id` INTEGER NULL,
    `competition_history_id` INTEGER NULL,
    `decided_by` VARCHAR(100) NULL,
    `decided_at` DATETIME(3) NULL,
    `decision_note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `source_assertion_assertion_key_key`(`assertion_key`),
    INDEX `source_assertion_source_document_id_node_id_idx`(`source_document_id`, `node_id`),
    INDEX `source_assertion_ingestion_run_id_idx`(`ingestion_run_id`),
    INDEX `source_assertion_horse_id_idx`(`horse_id`),
    INDEX `source_assertion_related_horse_id_idx`(`related_horse_id`),
    INDEX `source_assertion_writeup_id_idx`(`writeup_id`),
    INDEX `source_assertion_competition_history_id_idx`(`competition_history_id`),
    INDEX `source_assertion_persistence_state_idx`(`persistence_state`),
    INDEX `source_assertion_assertion_kind_idx`(`assertion_kind`),
    INDEX `source_assertion_subject_name_normalised_idx`(`subject_name_normalised`),
    PRIMARY KEY (`source_assertion_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `canonical_change_audit` (
    `canonical_change_audit_id` INTEGER NOT NULL AUTO_INCREMENT,
    `ingestion_run_id` INTEGER NULL,
    `source_assertion_id` INTEGER NULL,
    `horse_id` INTEGER NULL,
    `target_kind` ENUM('STOREHORSE_FIELD', 'STOREHORSE_DAM', 'STOREHORSE_SIRE', 'CANONICAL_WRITEUP', 'COMPETITION_HISTORY', 'APPROVAL_LINK', 'STUDBOOK_LINK', 'DISCIPLINE_LINK') NOT NULL,
    `target_id` INTEGER NULL,
    `field_name` VARCHAR(64) NULL,
    `previous_value` TEXT NULL,
    `new_value` TEXT NULL,
    `change_kind` ENUM('CREATED', 'UPDATED', 'CONFIRMED', 'REVERTED') NOT NULL,
    `decided_by` VARCHAR(100) NULL,
    `decision_note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `canonical_change_audit_ingestion_run_id_idx`(`ingestion_run_id`),
    INDEX `canonical_change_audit_source_assertion_id_idx`(`source_assertion_id`),
    INDEX `canonical_change_audit_horse_id_idx`(`horse_id`),
    INDEX `canonical_change_audit_target_kind_target_id_idx`(`target_kind`, `target_id`),
    PRIMARY KEY (`canonical_change_audit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `competition_history_ingestion_run_id_idx` ON `competition_history`(`ingestion_run_id`);

-- AddForeignKey
ALTER TABLE `competition_history` ADD CONSTRAINT `competition_history_ingestion_run_id_fkey` FOREIGN KEY (`ingestion_run_id`) REFERENCES `ingestion_run`(`ingestion_run_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingestion_run` ADD CONSTRAINT `ingestion_run_source_document_id_fkey` FOREIGN KEY (`source_document_id`) REFERENCES `source_document`(`source_document_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `canonical_writeup` ADD CONSTRAINT `canonical_writeup_source_document_id_fkey` FOREIGN KEY (`source_document_id`) REFERENCES `source_document`(`source_document_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `canonical_writeup` ADD CONSTRAINT `canonical_writeup_ingestion_run_id_fkey` FOREIGN KEY (`ingestion_run_id`) REFERENCES `ingestion_run`(`ingestion_run_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `source_assertion` ADD CONSTRAINT `source_assertion_source_document_id_fkey` FOREIGN KEY (`source_document_id`) REFERENCES `source_document`(`source_document_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `source_assertion` ADD CONSTRAINT `source_assertion_ingestion_run_id_fkey` FOREIGN KEY (`ingestion_run_id`) REFERENCES `ingestion_run`(`ingestion_run_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `source_assertion` ADD CONSTRAINT `source_assertion_writeup_id_fkey` FOREIGN KEY (`writeup_id`) REFERENCES `canonical_writeup`(`writeup_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `source_assertion` ADD CONSTRAINT `source_assertion_competition_history_id_fkey` FOREIGN KEY (`competition_history_id`) REFERENCES `competition_history`(`competition_history_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `canonical_change_audit` ADD CONSTRAINT `canonical_change_audit_ingestion_run_id_fkey` FOREIGN KEY (`ingestion_run_id`) REFERENCES `ingestion_run`(`ingestion_run_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `canonical_change_audit` ADD CONSTRAINT `canonical_change_audit_source_assertion_id_fkey` FOREIGN KEY (`source_assertion_id`) REFERENCES `source_assertion`(`source_assertion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
