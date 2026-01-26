-- Update schema for order payment fields
USE `c372_supermarketdb`;

-- Add payment_method column to orders table (only if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb'
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'payment_method');

SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `payment_method` varchar(20) NULL DEFAULT NULL AFTER `status`',
    'SELECT ''Column payment_method already exists'' AS info');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add payment_out_trade_no column to orders table (only if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb'
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'payment_out_trade_no');

SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `payment_out_trade_no` varchar(64) NULL DEFAULT NULL AFTER `payment_method`',
    'SELECT ''Column payment_out_trade_no already exists'' AS info');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add payment_provider_ref column to orders table (only if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb'
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'payment_provider_ref');

SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `payment_provider_ref` varchar(128) NULL DEFAULT NULL AFTER `payment_out_trade_no`',
    'SELECT ''Column payment_provider_ref already exists'' AS info');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add paid_at column to orders table (only if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb'
    AND TABLE_NAME = 'orders'
    AND COLUMN_NAME = 'paid_at');

SET @query = IF(@col_exists = 0,
    'ALTER TABLE `orders` ADD COLUMN `paid_at` timestamp NULL DEFAULT NULL AFTER `created_at`',
    'SELECT ''Column paid_at already exists'' AS info');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

