UPDATE `activity_log` SET `action` = 'flagged' WHERE `action` = 'skipped';
UPDATE `daily_review_items` SET `status` = 'flagged' WHERE `status` = 'skipped';
ALTER TABLE `activity_log` MODIFY COLUMN `action` enum('created','updated','deleted','reviewed','flagged','completed') NOT NULL;
ALTER TABLE `daily_review_items` MODIFY COLUMN `status` enum('pending','reviewed','flagged') NOT NULL DEFAULT 'pending';
ALTER TABLE `daily_reviews` CHANGE COLUMN `skippedCount` `flaggedCount` int NOT NULL DEFAULT 0;
ALTER TABLE `clients` ADD COLUMN `lastTouchedAt` timestamp NULL;
