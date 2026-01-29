-- ========================================
-- HB Mart Supermarket - Database Upgrade Script
-- Run this script to upgrade EXISTING database
-- This adds all new fields without dropping tables
-- ========================================

USE `c372_supermarketdb`;

SET FOREIGN_KEY_CHECKS = 0;

-- ========================================
-- 1. Update users table - add verified field
-- ========================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'verified');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `verified` TINYINT(1) NOT NULL DEFAULT 1 AFTER `role`',
    'SELECT ''users.verified exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================
-- 2. Update orders table - add all payment/voucher/status fields
-- ========================================

-- payment_method
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_method');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `payment_method` VARCHAR(20) DEFAULT NULL AFTER `status`',
    'SELECT ''orders.payment_method exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment_out_trade_no
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_out_trade_no');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `payment_out_trade_no` VARCHAR(64) DEFAULT NULL AFTER `payment_method`',
    'SELECT ''orders.payment_out_trade_no exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- payment_provider_ref
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'payment_provider_ref');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `payment_provider_ref` VARCHAR(128) DEFAULT NULL AFTER `payment_out_trade_no`',
    'SELECT ''orders.payment_provider_ref exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- paid_at
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'paid_at');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `paid_at` TIMESTAMP NULL AFTER `payment_provider_ref`',
    'SELECT ''orders.paid_at exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- voucher_id
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'voucher_id');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `voucher_id` INT(11) DEFAULT NULL AFTER `paid_at`',
    'SELECT ''orders.voucher_id exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- voucher_code
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'voucher_code');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `voucher_code` VARCHAR(20) DEFAULT NULL AFTER `voucher_id`',
    'SELECT ''orders.voucher_code exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- discount_amount
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discount_amount');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `discount_amount` DECIMAL(10,2) DEFAULT 0 AFTER `voucher_code`',
    'SELECT ''orders.discount_amount exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- final_total
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'final_total');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `final_total` DECIMAL(10,2) DEFAULT NULL AFTER `discount_amount`',
    'SELECT ''orders.final_total exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- shipment_status
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'shipment_status');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `shipment_status` VARCHAR(30) DEFAULT NULL AFTER `final_total`',
    'SELECT ''orders.shipment_status exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- refund_status
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'refund_status');
SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `refund_status` VARCHAR(30) DEFAULT NULL AFTER `shipment_status`',
    'SELECT ''orders.refund_status exists'' AS info');
PREPARE stmt FROM @query; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ========================================
-- 3. Create membership_plans table (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS `membership_plans` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(10,2) NOT NULL,
  `duration_days` INT(11) NOT NULL DEFAULT 30,
  `voucher_count` INT(11) NOT NULL DEFAULT 1,
  `voucher_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `voucher_value` DECIMAL(10,2) NOT NULL DEFAULT 10,
  `voucher_min_order` DECIMAL(10,2) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default plans if empty
INSERT INTO `membership_plans` (`name`, `description`, `price`, `duration_days`, `voucher_count`, `voucher_type`, `voucher_value`, `voucher_min_order`)
SELECT 'Bronze', 'Bronze membership - Get 2 x 10% off vouchers', 9.90, 30, 2, 'percentage', 10, 20
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `membership_plans` WHERE `name` = 'Bronze');

INSERT INTO `membership_plans` (`name`, `description`, `price`, `duration_days`, `voucher_count`, `voucher_type`, `voucher_value`, `voucher_min_order`)
SELECT 'Silver', 'Silver membership - Get 3 x 15% off vouchers', 19.90, 30, 3, 'percentage', 15, 15
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `membership_plans` WHERE `name` = 'Silver');

INSERT INTO `membership_plans` (`name`, `description`, `price`, `duration_days`, `voucher_count`, `voucher_type`, `voucher_value`, `voucher_min_order`)
SELECT 'Gold', 'Gold membership - Get 5 x 20% off vouchers', 39.90, 30, 5, 'percentage', 20, 10
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `membership_plans` WHERE `name` = 'Gold');

-- ========================================
-- 4. Create user_memberships table (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS `user_memberships` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `plan_id` INT(11) NOT NULL,
  `status` ENUM('Pending', 'Active', 'Expired', 'Cancelled') DEFAULT 'Pending',
  `payment_method` VARCHAR(20) DEFAULT NULL,
  `payment_ref` VARCHAR(100) DEFAULT NULL,
  `started_at` TIMESTAMP NULL,
  `expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_membership_user` (`user_id`),
  KEY `idx_user_membership_plan` (`plan_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 5. Create vouchers table (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS `vouchers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(20) NOT NULL,
  `user_id` INT(11) DEFAULT NULL,
  `type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage',
  `value` DECIMAL(10,2) NOT NULL,
  `min_order` DECIMAL(10,2) DEFAULT 0,
  `max_discount` DECIMAL(10,2) DEFAULT NULL,
  `is_used` TINYINT(1) DEFAULT 0,
  `used_at` TIMESTAMP NULL,
  `used_order_id` INT(11) DEFAULT NULL,
  `source` VARCHAR(50) DEFAULT 'membership',
  `membership_id` INT(11) DEFAULT NULL,
  `expires_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_voucher_code` (`code`),
  KEY `idx_voucher_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample vouchers if empty
INSERT INTO `vouchers` (`code`, `user_id`, `type`, `value`, `min_order`, `source`, `expires_at`)
SELECT 'WELCOME10', NULL, 'percentage', 10, 20, 'promotion', DATE_ADD(NOW(), INTERVAL 90 DAY)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `vouchers` WHERE `code` = 'WELCOME10');

INSERT INTO `vouchers` (`code`, `user_id`, `type`, `value`, `min_order`, `source`, `expires_at`)
SELECT 'SAVE5', NULL, 'fixed', 5, 30, 'promotion', DATE_ADD(NOW(), INTERVAL 90 DAY)
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `vouchers` WHERE `code` = 'SAVE5');

-- ========================================
-- 6. Create shipments table (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS `shipments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL,
  `tracking_number` VARCHAR(50) DEFAULT NULL,
  `carrier` VARCHAR(50) DEFAULT 'HB Mart Express',
  `status` ENUM('Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed') DEFAULT 'Processing',
  `estimated_delivery` DATE DEFAULT NULL,
  `shipped_at` TIMESTAMP NULL,
  `delivered_at` TIMESTAMP NULL,
  `recipient_name` VARCHAR(100) DEFAULT NULL,
  `recipient_address` VARCHAR(255) DEFAULT NULL,
  `recipient_phone` VARCHAR(20) DEFAULT NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shipment_order` (`order_id`),
  KEY `idx_shipment_tracking` (`tracking_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 7. Create shipment_tracking table (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS `shipment_tracking` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `shipment_id` INT(11) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `location` VARCHAR(100) DEFAULT NULL,
  `description` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tracking_shipment` (`shipment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 8. Create refunds table (if not exists)
-- ========================================
CREATE TABLE IF NOT EXISTS `refunds` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `reason` ENUM('Damaged', 'Wrong Item', 'Not as Described', 'Changed Mind', 'Late Delivery', 'Other') NOT NULL,
  `description` TEXT,
  `status` ENUM('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled') DEFAULT 'Pending',
  `admin_note` TEXT,
  `refund_method` VARCHAR(50) DEFAULT NULL,
  `refund_ref` VARCHAR(100) DEFAULT NULL,
  `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `processed_at` TIMESTAMP NULL,
  `completed_at` TIMESTAMP NULL,
  `processed_by` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_refund_order` (`order_id`),
  KEY `idx_refund_user` (`user_id`),
  KEY `idx_refund_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- Upgrade complete!
-- ========================================
SELECT 'Database upgrade completed successfully!' AS result;
