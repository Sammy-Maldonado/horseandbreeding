-- HOR-79: Modernise the authentication database foundation (ADR-012).
-- Curated from `prisma migrate diff` (0_init baseline -> canonical schema).
-- Deliberately EXCLUDED from the generated diff, with the evidence recorded in
-- ADR-012 and Linear HOR-79:
--   * `storehorse.height` widening (varchar(4) -> varchar(12)) — owned by HOR-82.
--   * Composite primary keys on `storehorse_has_approvedby` (52 duplicate
--     pairs) and `studbook_has_storehorse` (16696 duplicate pairs) — adding
--     them requires a business-data deduplication decision.
--   * Every foreign key with a MyISAM table on either side (storehorse,
--     gallery, breeder, sexe, studbook and the *_has_* link tables). MyISAM
--     cannot enforce them; two (competition_history, horse_views ->
--     storehorse) would fail outright. They follow the future engine waves.

-- AlterTable (legacy drift alignment, data-safe; `created` keeps its
-- historical timestamp(0) definition)
ALTER TABLE `competition_history` MODIFY `status` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `diciplinevalues` ADD COLUMN `group_priority` INTEGER NULL;

-- AlterTable (legacy PK was (horse_id, photo_id); zero duplicate pairs measured)
ALTER TABLE `gallery` DROP PRIMARY KEY,
    ADD COLUMN `gallery_id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD COLUMN `status` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `uploaded_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD PRIMARY KEY (`gallery_id`);

-- AlterTable
ALTER TABLE `marcustest` ALTER COLUMN `dob` DROP DEFAULT,
    ALTER COLUMN `foalingdate` DROP DEFAULT;

-- AlterTable (`height` deliberately untouched — HOR-82)
ALTER TABLE `storehorse` ADD COLUMN `ad_title` VARCHAR(100) NULL,
    ADD COLUMN `age` VARCHAR(10) NULL,
    ADD COLUMN `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `currency` VARCHAR(1) NULL,
    ADD COLUMN `seller_id` INTEGER NULL,
    ADD COLUMN `status` INTEGER NULL,
    MODIFY `dam_id` INTEGER NULL DEFAULT 0,
    MODIFY `remarks_short` VARCHAR(30) NULL;

-- AlterTable (email duplicate count measured 0 before the unique below)
ALTER TABLE `users` MODIFY `email` VARCHAR(191) NOT NULL,
    MODIFY `password` VARCHAR(100) NOT NULL DEFAULT '',
    MODIFY `address` TEXT NOT NULL DEFAULT '',
    MODIFY `welcome` TEXT NOT NULL DEFAULT '',
    MODIFY `news` TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `users_has_storehorse` ADD COLUMN `area_id` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL DEFAULT '',
    `full_name` VARCHAR(100) NOT NULL DEFAULT '',
    `county` VARCHAR(100) NOT NULL DEFAULT '',
    `type` VARCHAR(100) NOT NULL DEFAULT '',
    `latitude` INTEGER NOT NULL DEFAULT 0,
    `longitude` INTEGER NOT NULL DEFAULT 0,
    `county_id` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor` (
    `vendor_id` INTEGER NOT NULL AUTO_INCREMENT,
    `vendor_name` VARCHAR(191) NOT NULL,
    `vendor_contact` VARCHAR(191) NULL,
    `vendor_address` VARCHAR(191) NULL,

    PRIMARY KEY (`vendor_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_id` VARCHAR(191) NOT NULL,
    `client_secret` VARCHAR(191) NOT NULL,
    `redirect_uri` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_client_id_key`(`client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `authorization_codes` (
    `code` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `redirectUri` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `access_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token_hash` BINARY(32) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `access_tokens_token_hash_key`(`token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token_hash` BINARY(32) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `refresh_tokens_token_hash_key`(`token_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scopes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scope_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `scopes_scope_name_key`(`scope_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable (role_name is unique per user, never globally — ADR-012)
CREATE TABLE `user_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `role_name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `user_roles_role_name_user_id_key`(`role_name`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horse_views` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `horse_id` INTEGER NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `last_viewed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sellers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(255) NOT NULL DEFAULT '',
    `mobile` VARCHAR(20) NOT NULL DEFAULT '',
    `email` VARCHAR(100) NOT NULL DEFAULT '',
    `location` VARCHAR(191) NULL,
    `user_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_role_scope` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `scope_id` INTEGER NOT NULL,

    UNIQUE INDEX `user_role_scope_role_id_scope_id_key`(`role_id`, `scope_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `gallery_horse_id_photo_id_key` ON `gallery`(`horse_id`, `photo_id`);

-- CreateIndex
CREATE UNIQUE INDEX `storehorse_horse_id_key` ON `storehorse`(`horse_id`);

-- CreateIndex
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);

-- CreateIndex
CREATE INDEX `fk_area` ON `users_has_storehorse`(`area_id`);

-- AddForeignKey (InnoDB <-> InnoDB only; every child table is created empty
-- in this migration, so the orphan count for each constraint is zero)
ALTER TABLE `authorization_codes` ADD CONSTRAINT `authorization_codes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `authorization_codes` ADD CONSTRAINT `authorization_codes_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_tokens` ADD CONSTRAINT `access_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `access_tokens` ADD CONSTRAINT `access_tokens_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients`(`client_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_scope` ADD CONSTRAINT `user_role_scope_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `user_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_scope` ADD CONSTRAINT `user_role_scope_scope_id_fkey` FOREIGN KEY (`scope_id`) REFERENCES `scopes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `competition_history_storehorse_id_idx` ON `competition_history`(`storehorse_id`);
DROP INDEX `storehorse_id` ON `competition_history`;

-- RedefineIndex
CREATE INDEX `id_approvedby_horse` ON `storehorse_has_approvedby`(`id_approvedby`, `horse_id`);
DROP INDEX `id_approvedby` ON `storehorse_has_approvedby`;
