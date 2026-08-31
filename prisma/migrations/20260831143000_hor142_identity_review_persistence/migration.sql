-- HOR-142: Durable identity review persistence (ADR-018 §5, §11).
-- Curated from `prisma migrate diff --from-empty --to-schema`: only the two
-- new review tables and their InnoDB constraints. Strictly ADDITIVE: no table
-- or column is dropped, renamed or modified; `storehorse` is not touched (it
-- remains the single canonical horse registry — candidates and decisions
-- reference `storehorse.horse_id`; neither table is a second horse registry
-- and neither duplicates the `sire_id`/`dam_id` pedigree chain).
--
-- Deliberately EXCLUDED from the generated diff (evidence in Linear HOR-142):
--   * The two new relations towards `storehorse` —
--     `identity_review_case.decided_horse_id` and
--     `identity_review_candidate.horse_id`. `storehorse` is still MyISAM, so
--     an InnoDB child cannot hold a FOREIGN KEY to it (errno 150). They join
--     the ADR-012 deferral list next to the HOR-9 links and are enforced by
--     the application until the storehorse engine wave.
--   * Everything else the from-empty diff regenerates (the legacy tables and
--     the HOR-9 canonical model) — already applied by earlier migrations.

-- CreateTable
CREATE TABLE `identity_review_case` (
    `identity_review_case_id` INTEGER NOT NULL AUTO_INCREMENT,
    `review_case_key` CHAR(64) NOT NULL,
    `source_assertion_id` INTEGER NOT NULL,
    `outcome` ENUM('AMBIGUOUS', 'CONFLICT') NOT NULL,
    `name_key` VARCHAR(255) NULL,
    `reason_codes` JSON NOT NULL,
    `source_conflicts` JSON NOT NULL,
    `establishment` JSON NOT NULL,
    `resolver_contract_version` VARCHAR(31) NOT NULL,
    `review_state` ENUM('OPEN', 'DECIDED') NOT NULL DEFAULT 'OPEN',
    `decision` ENUM('ASSIGNED_EXISTING_HORSE', 'APPROVED_NEW_HORSE', 'KEPT_TEXT_ONLY', 'REJECTED') NULL,
    `decided_horse_id` INTEGER NULL,
    `decided_by` VARCHAR(100) NULL,
    `decided_at` DATETIME(3) NULL,
    `decision_note` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `identity_review_case_review_case_key_key`(`review_case_key`),
    INDEX `identity_review_case_source_assertion_id_idx`(`source_assertion_id`),
    INDEX `identity_review_case_review_state_idx`(`review_state`),
    INDEX `identity_review_case_outcome_idx`(`outcome`),
    INDEX `identity_review_case_decided_horse_id_idx`(`decided_horse_id`),
    PRIMARY KEY (`identity_review_case_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `identity_review_candidate` (
    `identity_review_candidate_id` INTEGER NOT NULL AUTO_INCREMENT,
    `identity_review_case_id` INTEGER NOT NULL,
    `horse_id` INTEGER NOT NULL,
    `candidate_order` INTEGER NOT NULL,
    `candidate_name` VARCHAR(255) NOT NULL,
    `classification` ENUM('SUPPORTED', 'CONFLICTED_SUPPORTED', 'MIXED', 'NEUTRAL', 'CONTRADICTED', 'EXCLUDED') NOT NULL,
    `signals` JSON NOT NULL,
    `corroborations` JSON NOT NULL,
    `contradictions` JSON NOT NULL,
    `rejection_reasons` JSON NOT NULL,

    INDEX `identity_review_candidate_horse_id_idx`(`horse_id`),
    UNIQUE INDEX `identity_review_candidate_case_order_key`(`identity_review_case_id`, `candidate_order`),
    PRIMARY KEY (`identity_review_candidate_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `identity_review_case` ADD CONSTRAINT `identity_review_case_source_assertion_id_fkey` FOREIGN KEY (`source_assertion_id`) REFERENCES `source_assertion`(`source_assertion_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `identity_review_candidate` ADD CONSTRAINT `identity_review_candidate_identity_review_case_id_fkey` FOREIGN KEY (`identity_review_case_id`) REFERENCES `identity_review_case`(`identity_review_case_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
