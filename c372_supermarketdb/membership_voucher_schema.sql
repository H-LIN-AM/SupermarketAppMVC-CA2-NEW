-- ========================================
-- Membership & Voucher System Schema
-- Run this script to add membership and voucher tables
-- ========================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table: membership_plans (会员套餐)
-- ----------------------------
DROP TABLE IF EXISTS `membership_plans`;
CREATE TABLE `membership_plans` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL COMMENT '套餐名称',
  `description` TEXT COMMENT '套餐描述',
  `price` DECIMAL(10,2) NOT NULL COMMENT '价格',
  `duration_days` INT(11) NOT NULL DEFAULT 30 COMMENT '有效天数',
  `voucher_count` INT(11) NOT NULL DEFAULT 1 COMMENT '赠送优惠券数量',
  `voucher_type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage' COMMENT '优惠券类型',
  `voucher_value` DECIMAL(10,2) NOT NULL DEFAULT 10 COMMENT '优惠券面值',
  `voucher_min_order` DECIMAL(10,2) DEFAULT 0 COMMENT '优惠券最低消费',
  `is_active` TINYINT(1) DEFAULT 1 COMMENT '是否启用',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认会员套餐
INSERT INTO `membership_plans` (`name`, `description`, `price`, `duration_days`, `voucher_count`, `voucher_type`, `voucher_value`, `voucher_min_order`) VALUES
('Bronze', 'Bronze membership - Get 2 x 10% off vouchers', 9.90, 30, 2, 'percentage', 10, 20),
('Silver', 'Silver membership - Get 3 x 15% off vouchers', 19.90, 30, 3, 'percentage', 15, 15),
('Gold', 'Gold membership - Get 5 x 20% off vouchers + $5 voucher', 39.90, 30, 6, 'percentage', 20, 10);

-- ----------------------------
-- Table: user_memberships (用户会员记录)
-- ----------------------------
DROP TABLE IF EXISTS `user_memberships`;
CREATE TABLE `user_memberships` (
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
  KEY `idx_user_membership` (`user_id`),
  KEY `idx_plan_membership` (`plan_id`),
  CONSTRAINT `fk_membership_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_membership_plan` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Table: vouchers (优惠券)
-- ----------------------------
DROP TABLE IF EXISTS `vouchers`;
CREATE TABLE `vouchers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(20) NOT NULL COMMENT '优惠码',
  `user_id` INT(11) DEFAULT NULL COMMENT '所属用户(NULL为通用券)',
  `type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage' COMMENT '类型',
  `value` DECIMAL(10,2) NOT NULL COMMENT '面值',
  `min_order` DECIMAL(10,2) DEFAULT 0 COMMENT '最低消费',
  `max_discount` DECIMAL(10,2) DEFAULT NULL COMMENT '最大折扣(百分比类型)',
  `is_used` TINYINT(1) DEFAULT 0 COMMENT '是否已使用',
  `used_at` TIMESTAMP NULL COMMENT '使用时间',
  `used_order_id` INT(11) DEFAULT NULL COMMENT '使用的订单ID',
  `source` VARCHAR(50) DEFAULT 'membership' COMMENT '来源(membership/admin/promotion)',
  `membership_id` INT(11) DEFAULT NULL COMMENT '关联会员记录',
  `expires_at` TIMESTAMP NULL COMMENT '过期时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_voucher_code` (`code`),
  KEY `idx_voucher_user` (`user_id`),
  CONSTRAINT `fk_voucher_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------
-- Alter orders table: add voucher fields
-- ----------------------------
ALTER TABLE `orders`
ADD COLUMN `voucher_id` INT(11) DEFAULT NULL COMMENT '使用的优惠券ID',
ADD COLUMN `voucher_code` VARCHAR(20) DEFAULT NULL COMMENT '优惠码',
ADD COLUMN `discount_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '优惠金额',
ADD COLUMN `final_total` DECIMAL(10,2) DEFAULT NULL COMMENT '最终金额(含运费减优惠)';

-- ----------------------------
-- Alter orders table: add payment fields if not exist
-- ----------------------------
-- Check and add columns if they don't exist (run separately if needed)
-- ALTER TABLE `orders` ADD COLUMN `paid_at` TIMESTAMP NULL;
-- ALTER TABLE `orders` ADD COLUMN `payment_method` VARCHAR(20) DEFAULT NULL;
-- ALTER TABLE `orders` ADD COLUMN `payment_out_trade_no` VARCHAR(64) DEFAULT NULL;
-- ALTER TABLE `orders` ADD COLUMN `payment_provider_ref` VARCHAR(128) DEFAULT NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- Sample vouchers for testing (optional)
-- ========================================
-- INSERT INTO `vouchers` (`code`, `user_id`, `type`, `value`, `min_order`, `source`, `expires_at`) VALUES
-- ('WELCOME10', NULL, 'percentage', 10, 20, 'promotion', DATE_ADD(NOW(), INTERVAL 30 DAY)),
-- ('SAVE5', NULL, 'fixed', 5, 30, 'promotion', DATE_ADD(NOW(), INTERVAL 30 DAY));
