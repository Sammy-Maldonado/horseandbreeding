-- CreateTable
CREATE TABLE `approvedby` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `approvedby` VARCHAR(45) NULL,
    `breed_code` VARCHAR(10) NOT NULL DEFAULT (),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `breeder` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `breedername` VARCHAR(255) NULL,
    `contactfname` VARCHAR(50) NULL,
    `contactlname` VARCHAR(50) NULL,
    `addr1` VARCHAR(255) NULL,
    `addr2` VARCHAR(255) NULL,
    `addr3` VARCHAR(255) NULL,
    `addr4` VARCHAR(255) NULL,
    `addr5` VARCHAR(255) NULL,
    `tel` VARCHAR(50) NULL,
    `email` VARCHAR(50) NULL,
    `website` VARCHAR(100) NULL,
    `mapref` VARCHAR(255) NULL,
    `logo` VARCHAR(255) NULL,
    `missionstatement` TEXT NULL,
    `notes` BLOB NULL,
    `twitterid` VARCHAR(255) NULL,
    `facebookurl` VARCHAR(255) NULL,
    `farmname` VARCHAR(255) NULL DEFAULT (Farm Name),
    `userId` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(255) NOT NULL DEFAULT (),
    `title` VARCHAR(255) NOT NULL DEFAULT (),
    `details` VARCHAR(255) NOT NULL DEFAULT (),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `counties` (
    `id` TINYINT NOT NULL AUTO_INCREMENT,
    `county` VARCHAR(50) NOT NULL DEFAULT (),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `countries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diciplines` (
    `iddiciplines` INTEGER NOT NULL DEFAULT 0,
    `diciplines` VARCHAR(45) NULL,

    PRIMARY KEY (`iddiciplines`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `diciplinevalues` (
    `idvalues` INTEGER NOT NULL DEFAULT 0,
    `diciplines_iddiciplines` INTEGER NOT NULL DEFAULT 0,
    `value` VARCHAR(45) NULL,
    `priority` INTEGER NULL,
    `short` VARCHAR(45) NULL,

    INDEX `fk_diciplinevalues_diciplines1`(`diciplines_iddiciplines`),
    PRIMARY KEY (`idvalues`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` INTEGER NOT NULL DEFAULT 0,
    `title` VARCHAR(255) NOT NULL DEFAULT (),
    `body` TEXT NOT NULL,
    `link` VARCHAR(255) NOT NULL DEFAULT (),
    `location` VARCHAR(255) NOT NULL DEFAULT (),
    `date` VARCHAR(255) NOT NULL DEFAULT (),
    `time` VARCHAR(255) NOT NULL DEFAULT (),
    `user` VARCHAR(255) NOT NULL DEFAULT (),
    `active` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forum_answer` (
    `question_id` INTEGER NOT NULL DEFAULT 0,
    `a_id` INTEGER NOT NULL DEFAULT 0,
    `a_name` VARCHAR(65) NOT NULL DEFAULT (),
    `a_email` VARCHAR(65) NOT NULL DEFAULT (),
    `a_answer` LONGTEXT NOT NULL,
    `a_datetime` VARCHAR(25) NOT NULL DEFAULT (),

    INDEX `a_id`(`a_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forum_question` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `topic` VARCHAR(255) NOT NULL DEFAULT (),
    `detail` LONGTEXT NOT NULL,
    `name` VARCHAR(65) NOT NULL DEFAULT (),
    `email` VARCHAR(65) NOT NULL DEFAULT (),
    `datetime` VARCHAR(25) NOT NULL DEFAULT (),
    `view` INTEGER NOT NULL DEFAULT 0,
    `reply` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery` (
    `user_id` INTEGER NOT NULL DEFAULT 0,
    `horse_id` INTEGER NOT NULL DEFAULT 0,
    `photo_id` VARCHAR(100) NOT NULL DEFAULT (),
    `title` VARCHAR(100) NOT NULL DEFAULT (),
    `description` VARCHAR(255) NOT NULL DEFAULT (),
    `type` INTEGER NOT NULL DEFAULT 0,
    `cover` BOOLEAN NOT NULL DEFAULT false,
    `uploaded_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `gallery_id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `gallery_horse_id_photo_id_key`(`horse_id`, `photo_id`),
    PRIMARY KEY (`gallery_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horse_class` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `class` VARCHAR(255) NOT NULL DEFAULT (),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `horse_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(266) NOT NULL,
    `dob` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `height` VARCHAR(10) NOT NULL,
    `length` VARCHAR(10) NOT NULL,
    `weight` VARCHAR(10) NOT NULL,
    `breed` VARCHAR(100) NOT NULL,
    `color` VARCHAR(50) NOT NULL,
    `saleprice` FLOAT NOT NULL,
    `horsepic` VARCHAR(255) NOT NULL,
    `description` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marcustest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `horsename` VARCHAR(255) NULL,
    `dob` DATETIME(0) NULL DEFAULT (0000-00-00 00:00:00),
    `sexe` INTEGER NULL DEFAULT 0,
    `comment` BLOB NULL,
    `foalingdate` DATETIME(0) NULL DEFAULT (0000-00-00 00:00:00),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `horse_id` INTEGER NOT NULL DEFAULT 0,
    `photo` VARCHAR(255) NOT NULL DEFAULT (),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sexe` (
    `idsexe` INTEGER NOT NULL DEFAULT 0,
    `type` VARCHAR(45) NOT NULL DEFAULT (),

    PRIMARY KEY (`idsexe`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storehorse` (
    `horse_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL DEFAULT (),
    `birthyear` INTEGER NOT NULL DEFAULT 0,
    `regnr` VARCHAR(20) NOT NULL DEFAULT (0),
    `predicates` VARCHAR(100) NOT NULL DEFAULT (),
    `color` VARCHAR(20) NOT NULL DEFAULT (),
    `height` VARCHAR(12) NOT NULL DEFAULT (0),
    `sell_price` FLOAT NULL,
    `sell_price_type` INTEGER NULL,
    `alias` VARCHAR(100) NOT NULL DEFAULT (),
    `breeding_way` VARCHAR(25) NOT NULL DEFAULT (),
    `sire_id` INTEGER NOT NULL DEFAULT 0,
    `dam_id` INTEGER NULL DEFAULT 0,
    `sexe` INTEGER NOT NULL DEFAULT 1,
    `remarks_short` VARCHAR(30) NOT NULL DEFAULT (),
    `remarks` TEXT NULL,
    `horse_type` VARCHAR(45) NOT NULL DEFAULT (),
    `comments` TEXT NULL,
    `forsale` INTEGER NULL DEFAULT 0,
    `entered` INTEGER NOT NULL DEFAULT 0,
    `last_updated` INTEGER NOT NULL DEFAULT 0,
    `breeder` INTEGER NOT NULL DEFAULT 0,
    `owner` INTEGER NOT NULL DEFAULT 0,
    `competitionAuthority` TEXT NULL,
    `rider` INTEGER NOT NULL DEFAULT 0,
    `breederid` INTEGER NULL DEFAULT 0,
    `sport_result_jumping` INTEGER NULL,
    `sport_result_dressage` INTEGER NULL,
    `sport_result_eventing` INTEGER NULL,
    `basic_premium` INTEGER NULL,
    `mareline_id` VARCHAR(8) NULL,
    `status` INTEGER NULL,
    `currency` VARCHAR(1) NULL,
    `age` VARCHAR(10) NULL,
    `ad_title` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `seller_id` INTEGER NULL,

    INDEX `fk_dam`(`dam_id`),
    INDEX `fk_sire`(`sire_id`),
    INDEX `fk_storehorse_sexe1`(`sexe`),
    UNIQUE INDEX `storehorse_horse_id_key`(`horse_id`),
    PRIMARY KEY (`horse_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `areas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL DEFAULT (),
    `full_name` VARCHAR(100) NOT NULL DEFAULT (),
    `county` VARCHAR(100) NOT NULL DEFAULT (),
    `type` VARCHAR(100) NOT NULL DEFAULT (),
    `latitude` INTEGER NOT NULL DEFAULT 0,
    `longitude` INTEGER NOT NULL DEFAULT 0,
    `county_id` INTEGER NOT NULL DEFAULT 0,
    `status` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storehorse_has_approvedby` (
    `id_approvedby` INTEGER NOT NULL DEFAULT 0,
    `horse_id` INTEGER NOT NULL DEFAULT 0,

    INDEX `id_approvedby_horse`(`id_approvedby`, `horse_id`),
    PRIMARY KEY (`id_approvedby`, `horse_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storehorse_has_diciplinevalues` (
    `storehorse_horse_id` INTEGER NOT NULL DEFAULT 0,
    `diciplinevalues_idvalues` INTEGER NOT NULL DEFAULT 0,

    INDEX `fk_storehorse_has_diciplinevalues_diciplinevalues1`(`diciplinevalues_idvalues`),
    INDEX `fk_storehorse_has_diciplinevalues_storehorse1`(`storehorse_horse_id`),
    PRIMARY KEY (`storehorse_horse_id`, `diciplinevalues_idvalues`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storehorse_has_media` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `horse_id` INTEGER NOT NULL DEFAULT 0,
    `media_type` CHAR(1) NOT NULL DEFAULT (),
    `media` VARCHAR(60) NOT NULL DEFAULT (),
    `deleted` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `storehorse_new` (
    `horse_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL DEFAULT (),
    `birthyear` INTEGER NOT NULL DEFAULT 0,
    `regnr` VARCHAR(20) NOT NULL DEFAULT (0),
    `predicates` VARCHAR(100) NOT NULL DEFAULT (),
    `color` VARCHAR(20) NOT NULL DEFAULT (),
    `height` VARCHAR(4) NOT NULL DEFAULT (0),
    `sell_price` FLOAT NULL,
    `sell_price_type` INTEGER NULL,
    `alias` VARCHAR(100) NOT NULL DEFAULT (),
    `breeding_way` VARCHAR(25) NOT NULL DEFAULT (),
    `sire_id` INTEGER NOT NULL DEFAULT 0,
    `dam_id` INTEGER NOT NULL DEFAULT 0,
    `sexe` INTEGER NOT NULL DEFAULT 1,
    `remarks_short` VARCHAR(30) NOT NULL DEFAULT (),
    `remarks` TEXT NULL,
    `horse_type` VARCHAR(45) NOT NULL DEFAULT (),
    `comments` TEXT NULL,
    `forsale` INTEGER NULL DEFAULT 0,
    `entered` INTEGER NOT NULL DEFAULT 0,
    `last_updated` INTEGER NOT NULL DEFAULT 0,
    `breeder` INTEGER NOT NULL DEFAULT 0,
    `owner` INTEGER NOT NULL DEFAULT 0,
    `competitionAuthority` TEXT NULL,
    `rider` INTEGER NOT NULL DEFAULT 0,
    `breederid` INTEGER NULL DEFAULT 0,
    `sport_result_jumping` INTEGER NULL,
    `sport_result_dressage` INTEGER NULL,
    `sport_result_eventing` INTEGER NULL,
    `basic_premium` INTEGER NULL,
    `mareline_id` VARCHAR(8) NULL,
    `tag` MEDIUMTEXT NULL,

    INDEX `fk_dam`(`dam_id`),
    INDEX `fk_sire`(`sire_id`),
    INDEX `fk_storehorse_sexe1`(`sexe`),
    PRIMARY KEY (`horse_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studbook` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(45) NOT NULL DEFAULT (),
    `abbr` VARCHAR(6) NOT NULL DEFAULT (),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studbook_has_storehorse` (
    `studbook_id` INTEGER NOT NULL DEFAULT 0,
    `storehorse_horse_id` INTEGER NOT NULL DEFAULT 0,

    INDEX `storehorse_horse_id`(`storehorse_horse_id`),
    INDEX `studbook_id`(`studbook_id`, `storehorse_horse_id`),
    PRIMARY KEY (`studbook_id`, `storehorse_horse_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_color` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `color_name` VARCHAR(50) NOT NULL,
    `color_code` VARCHAR(10) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_price` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` VARCHAR(255) NOT NULL,
    `status` INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `userlog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `raiseddate` DATETIME(0) NULL,
    `description` VARCHAR(255) NULL,
    `comment` BLOB NULL,
    `userid` VARCHAR(45) NULL DEFAULT (0),
    `horseid` INTEGER NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `email` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(50) NOT NULL DEFAULT (),
    `last_name` VARCHAR(50) NOT NULL DEFAULT (),
    `town` VARCHAR(50) NOT NULL DEFAULT (),
    `countyId` TINYINT NOT NULL DEFAULT 0,
    `password` VARCHAR(100) NOT NULL DEFAULT (),
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` VARCHAR(254) NOT NULL DEFAULT (),
    `answer` VARCHAR(200) NULL DEFAULT (),
    `user_type` INTEGER NOT NULL DEFAULT 0,
    `address` TEXT NOT NULL DEFAULT '',
    `telephone` VARCHAR(20) NOT NULL DEFAULT (),
    `mobile` VARCHAR(45) NOT NULL DEFAULT (),
    `website` VARCHAR(45) NOT NULL DEFAULT (),
    `googlemap` VARCHAR(255) NOT NULL DEFAULT (),
    `farmname` VARCHAR(255) NOT NULL DEFAULT (),
    `welcome` TEXT NOT NULL DEFAULT '',
    `logo` VARCHAR(255) NOT NULL DEFAULT (),
    `news` TEXT NOT NULL DEFAULT '',
    `status` INTEGER NULL DEFAULT 0,
    `is_breeder` INTEGER NULL DEFAULT 0,
    `is_owner` INTEGER NULL DEFAULT 0,
    `is_stud` INTEGER NULL DEFAULT 0,
    `zip_code` VARCHAR(50) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users_has_storehorse` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL DEFAULT 0,
    `horse_id` INTEGER NOT NULL DEFAULT 0,
    `horse_class` INTEGER NOT NULL DEFAULT 0,
    `breeder` INTEGER NOT NULL DEFAULT 0,
    `rider` INTEGER NOT NULL DEFAULT 0,
    `studfarm` INTEGER NOT NULL DEFAULT 0,
    `owner` INTEGER NOT NULL DEFAULT 0,
    `area_id` INTEGER NOT NULL DEFAULT 0,

    INDEX `fk_area`(`area_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `videos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `horse_id` INTEGER NOT NULL,
    `vurl` VARCHAR(255) NULL,
    `cover` BOOLEAN NOT NULL DEFAULT false,
    `uploaded_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

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
    `token` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `token` VARCHAR(191) NOT NULL,
    `client_id` VARCHAR(191) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expires_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scopes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scope_name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `scopes_scope_name_key`(`scope_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `role_name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `user_roles_role_name_key`(`role_name`),
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
    `full_name` VARCHAR(255) NOT NULL DEFAULT (),
    `mobile` VARCHAR(20) NOT NULL DEFAULT (),
    `email` VARCHAR(100) NOT NULL DEFAULT (),
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

-- AddForeignKey
ALTER TABLE `diciplinevalues` ADD CONSTRAINT `fk_diciplinevalues_diciplines1` FOREIGN KEY (`diciplines_iddiciplines`) REFERENCES `diciplines`(`iddiciplines`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `gallery` ADD CONSTRAINT `gallery_horse_id_fkey` FOREIGN KEY (`horse_id`) REFERENCES `storehorse`(`horse_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse` ADD CONSTRAINT `storehorse_breederid_fkey` FOREIGN KEY (`breederid`) REFERENCES `breeder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse` ADD CONSTRAINT `storehorse_sexe_fkey` FOREIGN KEY (`sexe`) REFERENCES `sexe`(`idsexe`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse` ADD CONSTRAINT `dam_id_relation` FOREIGN KEY (`dam_id`) REFERENCES `storehorse`(`horse_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse` ADD CONSTRAINT `sire_id_relation` FOREIGN KEY (`sire_id`) REFERENCES `storehorse`(`horse_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse` ADD CONSTRAINT `storehorse_seller_id_fkey` FOREIGN KEY (`seller_id`) REFERENCES `sellers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse_has_approvedby` ADD CONSTRAINT `storehorse_has_approvedby_horse_id_fkey` FOREIGN KEY (`horse_id`) REFERENCES `storehorse`(`horse_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse_has_approvedby` ADD CONSTRAINT `storehorse_has_approvedby_id_approvedby_fkey` FOREIGN KEY (`id_approvedby`) REFERENCES `approvedby`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse_has_diciplinevalues` ADD CONSTRAINT `storehorse_has_diciplinevalues_storehorse_horse_id_fkey` FOREIGN KEY (`storehorse_horse_id`) REFERENCES `storehorse`(`horse_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `storehorse_has_diciplinevalues` ADD CONSTRAINT `storehorse_has_diciplinevalues_diciplinevalues_idvalues_fkey` FOREIGN KEY (`diciplinevalues_idvalues`) REFERENCES `diciplinevalues`(`idvalues`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studbook_has_storehorse` ADD CONSTRAINT `studbook_has_storehorse_storehorse_horse_id_fkey` FOREIGN KEY (`storehorse_horse_id`) REFERENCES `storehorse`(`horse_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studbook_has_storehorse` ADD CONSTRAINT `studbook_has_storehorse_studbook_id_fkey` FOREIGN KEY (`studbook_id`) REFERENCES `studbook`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_has_storehorse` ADD CONSTRAINT `users_has_storehorse_area_id_fkey` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_has_storehorse` ADD CONSTRAINT `users_has_storehorse_horse_id_fkey` FOREIGN KEY (`horse_id`) REFERENCES `storehorse`(`horse_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users_has_storehorse` ADD CONSTRAINT `users_has_storehorse_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
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
ALTER TABLE `horse_views` ADD CONSTRAINT `horse_views_horse_id_fkey` FOREIGN KEY (`horse_id`) REFERENCES `storehorse`(`horse_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_scope` ADD CONSTRAINT `user_role_scope_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `user_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_role_scope` ADD CONSTRAINT `user_role_scope_scope_id_fkey` FOREIGN KEY (`scope_id`) REFERENCES `scopes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
