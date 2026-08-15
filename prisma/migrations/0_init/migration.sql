-- HOR-79: Faithful baseline of the historical hbold database (30 tables).
-- Provenance: structure-only mariadb-dump of a clean restore of _legacy/hbold_backup.sql,
-- with data-artefact AUTO_INCREMENT counters stripped. Storage engines (24 MyISAM / 6 InnoDB),
-- charset latin1 and collation latin1_swedish_ci are preserved deliberately: this migration
-- records historical reality. Modernisation (InnoDB, new auth structures, FKs) happens in
-- explicit later migrations. See ADR-012.
/*M!999999\- enable the sandbox mode */ 

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `approvedby` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `approvedby` varchar(45) DEFAULT NULL,
  `breed_code` varchar(10) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `breeder` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `breedername` varchar(255) DEFAULT NULL,
  `contactfname` varchar(50) DEFAULT NULL,
  `contactlname` varchar(50) DEFAULT NULL,
  `addr1` varchar(255) DEFAULT NULL,
  `addr2` varchar(255) DEFAULT NULL,
  `addr3` varchar(255) DEFAULT NULL,
  `addr4` varchar(255) DEFAULT NULL,
  `addr5` varchar(255) DEFAULT NULL,
  `tel` varchar(50) DEFAULT NULL,
  `email` varchar(50) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `mapref` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `missionstatement` text DEFAULT NULL,
  `notes` blob DEFAULT NULL,
  `twitterid` varchar(255) DEFAULT NULL,
  `facebookurl` varchar(255) DEFAULT NULL,
  `farmname` varchar(255) DEFAULT 'Farm Name' COMMENT 'This the name of the farm',
  `userId` int(10) NOT NULL DEFAULT 0 COMMENT 'this is the userId from the table users',
  PRIMARY KEY (`id`),
  UNIQUE KEY `userId` (`userId`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL DEFAULT '',
  `title` varchar(255) NOT NULL DEFAULT '',
  `details` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='user feedback form';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `competition_history` (
  `competition_history_id` int(11) NOT NULL AUTO_INCREMENT,
  `horse_name` varchar(255) DEFAULT NULL,
  `storehorse_id` int(20) DEFAULT NULL,
  `rider` varchar(255) DEFAULT NULL,
  `competition_year` int(11) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `csi` varchar(10) DEFAULT NULL,
  `type` varchar(10) DEFAULT NULL,
  `height` decimal(5,2) DEFAULT NULL,
  `placed_in_competition` varchar(50) DEFAULT NULL,
  `detail` varchar(255) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1,
  `created` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`competition_history_id`),
  KEY `storehorse_id` (`storehorse_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Competition history details';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `counties` (
  `id` tinyint(4) NOT NULL AUTO_INCREMENT,
  `county` varchar(50) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `countries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `diciplines` (
  `iddiciplines` int(11) NOT NULL DEFAULT 0,
  `diciplines` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`iddiciplines`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `diciplinevalues` (
  `idvalues` int(11) NOT NULL DEFAULT 0,
  `diciplines_iddiciplines` int(11) NOT NULL DEFAULT 0,
  `value` varchar(45) DEFAULT NULL,
  `priority` int(11) DEFAULT NULL,
  `short` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`idvalues`),
  KEY `fk_diciplinevalues_diciplines1` (`diciplines_iddiciplines`),
  CONSTRAINT `fk_diciplinevalues_diciplines1` FOREIGN KEY (`diciplines_iddiciplines`) REFERENCES `diciplines` (`iddiciplines`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type` int(2) NOT NULL DEFAULT 0 COMMENT 'event, breeding, jumping, dressage, eventing',
  `title` varchar(255) NOT NULL DEFAULT '' COMMENT 'title of event',
  `body` text NOT NULL COMMENT 'content of event',
  `link` varchar(255) NOT NULL DEFAULT '' COMMENT 'link to website premier users only',
  `location` varchar(255) NOT NULL DEFAULT '' COMMENT 'county event will be held in',
  `date` varchar(255) NOT NULL DEFAULT '' COMMENT 'start date of event',
  `time` varchar(255) NOT NULL DEFAULT '' COMMENT 'start time of event',
  `user` varchar(255) NOT NULL DEFAULT '' COMMENT 'user who entered event',
  `active` int(1) NOT NULL DEFAULT 1 COMMENT '0 is not active 1 is active',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_answer` (
  `question_id` int(4) NOT NULL DEFAULT 0,
  `a_id` int(4) NOT NULL DEFAULT 0,
  `a_name` varchar(65) NOT NULL DEFAULT '',
  `a_email` varchar(65) NOT NULL DEFAULT '',
  `a_answer` longtext NOT NULL,
  `a_datetime` varchar(25) NOT NULL DEFAULT '',
  KEY `a_id` (`a_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_question` (
  `id` int(4) NOT NULL AUTO_INCREMENT,
  `topic` varchar(255) NOT NULL DEFAULT '',
  `detail` longtext NOT NULL,
  `name` varchar(65) NOT NULL DEFAULT '',
  `email` varchar(65) NOT NULL DEFAULT '',
  `datetime` varchar(25) NOT NULL DEFAULT '',
  `view` int(4) NOT NULL DEFAULT 0,
  `reply` int(4) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `gallery` (
  `user_id` int(11) NOT NULL DEFAULT 0 COMMENT 'The user that uploaded the photo',
  `horse_id` int(20) NOT NULL DEFAULT 0 COMMENT 'The horse the photo belongs to',
  `photo_id` varchar(100) NOT NULL DEFAULT '' COMMENT 'The unique image name',
  `title` varchar(100) NOT NULL DEFAULT '' COMMENT 'The title of the image',
  `description` varchar(255) NOT NULL DEFAULT '' COMMENT 'A description of image.',
  `type` int(11) NOT NULL DEFAULT 0 COMMENT 'Type of image,  0 for body, 1 for head.',
  `cover` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'If the photo should be a cover photo',
  `uploaded_date` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE current_timestamp() COMMENT 'Date photo was uploaded',
  PRIMARY KEY (`horse_id`,`photo_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `horse_class` (
  `id` int(255) NOT NULL AUTO_INCREMENT,
  `class` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='this table contains the classes broodmare, foal etc';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `horse_details` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(266) NOT NULL,
  `dob` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `height` varchar(10) NOT NULL,
  `length` varchar(10) NOT NULL,
  `weight` varchar(10) NOT NULL,
  `breed` varchar(100) NOT NULL,
  `color` varchar(50) NOT NULL,
  `saleprice` float NOT NULL,
  `horsepic` varchar(255) NOT NULL,
  `description` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `marcustest` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `horsename` varchar(255) DEFAULT NULL,
  `dob` datetime DEFAULT '0000-00-00 00:00:00',
  `sexe` int(11) DEFAULT 0,
  `comment` blob DEFAULT NULL,
  `foalingdate` datetime DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `photos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `horse_id` int(11) NOT NULL DEFAULT 0,
  `photo` varchar(255) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='stores the loc of the horse photo';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `sexe` (
  `idsexe` int(11) NOT NULL DEFAULT 0,
  `type` varchar(45) NOT NULL DEFAULT '',
  PRIMARY KEY (`idsexe`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `storehorse` (
  `horse_id` int(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL DEFAULT '',
  `birthyear` int(5) NOT NULL DEFAULT 0,
  `regnr` varchar(20) NOT NULL DEFAULT '0',
  `predicates` varchar(100) NOT NULL DEFAULT '',
  `color` varchar(20) NOT NULL DEFAULT '',
  `height` varchar(4) NOT NULL DEFAULT '0',
  `sell_price` float DEFAULT NULL,
  `sell_price_type` int(11) DEFAULT NULL,
  `alias` varchar(100) NOT NULL DEFAULT '',
  `breeding_way` varchar(25) NOT NULL DEFAULT '',
  `sire_id` int(20) NOT NULL DEFAULT 0,
  `dam_id` int(20) NOT NULL DEFAULT 0,
  `sexe` int(11) NOT NULL DEFAULT 1,
  `remarks_short` varchar(30) NOT NULL DEFAULT '',
  `remarks` text DEFAULT NULL,
  `horse_type` varchar(45) NOT NULL DEFAULT '' COMMENT 'appears on profile page broodmare, sporthorse, foal',
  `comments` text DEFAULT NULL COMMENT 'appears on profile page more detailed than remarks',
  `forsale` int(11) DEFAULT 0 COMMENT 'is the horse for sale?',
  `entered` int(45) NOT NULL DEFAULT 0 COMMENT 'user who entered the details into the database',
  `last_updated` int(45) NOT NULL DEFAULT 0 COMMENT 'person who last edited the horses details',
  `breeder` int(60) NOT NULL DEFAULT 0 COMMENT 'enter in iuser d if applies',
  `owner` int(60) NOT NULL DEFAULT 0 COMMENT 'enter in iuser d if applies',
  `competitionAuthority` text DEFAULT NULL COMMENT 'govering body for competition results',
  `rider` int(60) NOT NULL DEFAULT 0 COMMENT 'enter in iuser d if applies',
  `breederid` int(11) DEFAULT 0 COMMENT 'This is the 2nd breeder field in this table and relates across to the breeder table, not the user table.',
  `sport_result_jumping` int(11) DEFAULT NULL,
  `sport_result_dressage` int(11) DEFAULT NULL,
  `sport_result_eventing` int(11) DEFAULT NULL,
  `basic_premium` int(11) DEFAULT NULL,
  `mareline_id` varchar(8) DEFAULT NULL COMMENT 'only marcus inserts',
  PRIMARY KEY (`horse_id`),
  KEY `fk_sire` (`sire_id`),
  KEY `fk_dam` (`dam_id`),
  KEY `fk_storehorse_sexe1` (`sexe`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Stored horse details';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `storehorse_has_approvedby` (
  `id_approvedby` int(11) NOT NULL DEFAULT 0,
  `horse_id` int(11) NOT NULL DEFAULT 0,
  KEY `id_approvedby` (`id_approvedby`,`horse_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `storehorse_has_diciplinevalues` (
  `storehorse_horse_id` int(20) NOT NULL DEFAULT 0,
  `diciplinevalues_idvalues` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`storehorse_horse_id`,`diciplinevalues_idvalues`),
  KEY `fk_storehorse_has_diciplinevalues_storehorse1` (`storehorse_horse_id`),
  KEY `fk_storehorse_has_diciplinevalues_diciplinevalues1` (`diciplinevalues_idvalues`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `storehorse_has_media` (
  `id` int(45) NOT NULL AUTO_INCREMENT,
  `horse_id` int(45) NOT NULL DEFAULT 0,
  `media_type` char(1) NOT NULL DEFAULT '' COMMENT '0 for photo 1 for video or link to youtube video :)',
  `media` varchar(60) NOT NULL DEFAULT '',
  `deleted` int(1) NOT NULL DEFAULT 0 COMMENT '0 is active 1 is deleted',
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='stores horse profile media in database';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `storehorse_new` (
  `horse_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL DEFAULT '',
  `birthyear` int(11) NOT NULL DEFAULT 0,
  `regnr` varchar(20) NOT NULL DEFAULT '0',
  `predicates` varchar(100) NOT NULL DEFAULT '',
  `color` varchar(20) NOT NULL DEFAULT '',
  `height` varchar(4) NOT NULL DEFAULT '0',
  `sell_price` float DEFAULT NULL,
  `sell_price_type` int(11) DEFAULT NULL,
  `alias` varchar(100) NOT NULL DEFAULT '',
  `breeding_way` varchar(25) NOT NULL DEFAULT '',
  `sire_id` int(11) NOT NULL DEFAULT 0,
  `dam_id` int(11) NOT NULL DEFAULT 0,
  `sexe` int(11) NOT NULL DEFAULT 1,
  `remarks_short` varchar(30) NOT NULL DEFAULT '',
  `remarks` text DEFAULT NULL,
  `horse_type` varchar(45) NOT NULL DEFAULT '' COMMENT 'appears on profile page broodmare, sporthorse, foal',
  `comments` text DEFAULT NULL COMMENT 'appears on profile page more detailed than remarks',
  `forsale` int(11) DEFAULT 0 COMMENT 'is the horse for sale?',
  `entered` int(11) NOT NULL DEFAULT 0 COMMENT 'user who entered the details into the database',
  `last_updated` int(11) NOT NULL DEFAULT 0 COMMENT 'person who last edited the horses details',
  `breeder` int(11) NOT NULL DEFAULT 0 COMMENT 'enter in iuser d if applies',
  `owner` int(11) NOT NULL DEFAULT 0 COMMENT 'enter in iuser d if applies',
  `competitionAuthority` text DEFAULT NULL COMMENT 'govering body for competition results',
  `rider` int(11) NOT NULL DEFAULT 0 COMMENT 'enter in iuser d if applies',
  `breederid` int(11) DEFAULT 0 COMMENT 'This is the 2nd breeder field in this table and relates across to the breeder table, not the user table.',
  `sport_result_jumping` int(11) DEFAULT NULL,
  `sport_result_dressage` int(11) DEFAULT NULL,
  `sport_result_eventing` int(11) DEFAULT NULL,
  `basic_premium` int(11) DEFAULT NULL,
  `mareline_id` varchar(8) DEFAULT NULL COMMENT 'only marcus inserts',
  `tag` mediumtext DEFAULT NULL,
  PRIMARY KEY (`horse_id`),
  KEY `fk_sire` (`sire_id`),
  KEY `fk_dam` (`dam_id`),
  KEY `fk_storehorse_sexe1` (`sexe`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='Stored horse details';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `studbook` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL DEFAULT '',
  `abbr` varchar(6) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `studbook_has_storehorse` (
  `studbook_id` int(11) NOT NULL DEFAULT 0,
  `storehorse_horse_id` int(11) NOT NULL DEFAULT 0,
  KEY `studbook_id` (`studbook_id`,`storehorse_horse_id`),
  KEY `storehorse_horse_id` (`storehorse_horse_id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_color` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `color_name` varchar(50) NOT NULL,
  `color_code` varchar(10) NOT NULL,
  `status` int(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `tbl_price` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `value` varchar(255) NOT NULL,
  `status` int(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `userlog` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `raiseddate` datetime DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `comment` blob DEFAULT NULL,
  `userid` varchar(45) DEFAULT '0',
  `horseid` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `email` varchar(100) NOT NULL DEFAULT '',
  `first_name` varchar(50) NOT NULL DEFAULT '',
  `last_name` varchar(50) NOT NULL DEFAULT '',
  `town` varchar(50) NOT NULL DEFAULT '',
  `countyId` tinyint(4) NOT NULL DEFAULT 0,
  `password` varchar(50) NOT NULL DEFAULT '',
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `question` varchar(254) NOT NULL DEFAULT '' COMMENT 'secret question',
  `answer` varchar(200) DEFAULT '',
  `user_type` int(1) NOT NULL DEFAULT 0 COMMENT '0, 1 standard, premuim',
  `address` text NOT NULL,
  `telephone` varchar(20) NOT NULL DEFAULT '',
  `mobile` varchar(45) NOT NULL DEFAULT '' COMMENT 'mobile phone number',
  `website` varchar(45) NOT NULL DEFAULT '',
  `googlemap` varchar(255) NOT NULL DEFAULT '',
  `farmname` varchar(255) NOT NULL DEFAULT '',
  `welcome` text NOT NULL COMMENT 'welcome area of profile page',
  `logo` varchar(255) NOT NULL DEFAULT '' COMMENT 'profile logo',
  `news` text NOT NULL COMMENT 'profile news',
  `status` int(11) DEFAULT 0,
  `is_breeder` int(11) DEFAULT 0,
  `is_owner` int(11) DEFAULT 0,
  `is_stud` int(11) DEFAULT 0,
  `zip_code` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_has_storehorse` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL DEFAULT 0,
  `horse_id` int(11) NOT NULL DEFAULT 0,
  `horse_class` int(5) NOT NULL DEFAULT 0 COMMENT 'corresponds to the table horse_class',
  `breeder` int(2) NOT NULL DEFAULT 0,
  `rider` int(2) NOT NULL DEFAULT 0,
  `studfarm` int(2) NOT NULL DEFAULT 0,
  `owner` int(2) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci COMMENT='This webpage allows user to have many horses';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `horse_id` int(11) NOT NULL,
  `vurl` varchar(255) DEFAULT NULL,
  `cover` tinyint(1) NOT NULL DEFAULT 0,
  `uploaded_date` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

