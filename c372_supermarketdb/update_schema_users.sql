-- ========================================
-- Update schema for users table
-- Add verified field for email verification
-- ========================================

USE `c372_supermarketdb`;

-- Add verified column to users table (only if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'c372_supermarketdb'
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'verified');

SET @query = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT ''Email verified status'' AFTER `role`',
    'SELECT ''Column verified already exists'' AS info');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing users to verified (optional - for existing accounts)
-- UPDATE users SET verified = 1 WHERE verified = 0;
