-- ========================================
-- HB Mart Supermarket - Complete Database Schema
-- This is the FULL schema including all tables and fields
-- Run this script for a fresh database setup
-- ========================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ========================================
-- Create Database (if not exists)
-- ========================================
CREATE DATABASE IF NOT EXISTS `c372_supermarketdb` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `c372_supermarketdb`;

-- ========================================
-- Table: users (用户表)
-- ========================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `email` VARCHAR(255) NOT NULL COMMENT '邮箱',
  `password` VARCHAR(255) NOT NULL COMMENT '密码(SHA1)',
  `address` VARCHAR(255) NOT NULL COMMENT '地址',
  `contact` VARCHAR(20) NOT NULL COMMENT '联系电话',
  `role` ENUM('user', 'admin') NOT NULL DEFAULT 'user' COMMENT '角色',
  `verified` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '邮箱验证状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: 123456)
INSERT INTO `users` (`username`, `email`, `password`, `address`, `contact`, `role`, `verified`) VALUES
('Admin', 'admin@hbmart.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'HB Mart HQ', '12345678', 'admin', 1),
('Test User', 'user@hbmart.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', '123 Test Street', '87654321', 'user', 1);

-- ========================================
-- Table: products (商品表)
-- ========================================
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `productName` VARCHAR(200) NOT NULL COMMENT '商品名称',
  `category` VARCHAR(50) DEFAULT 'General' COMMENT '分类',
  `quantity` INT(11) NOT NULL DEFAULT 0 COMMENT '库存数量',
  `price` DECIMAL(10,2) NOT NULL COMMENT '价格',
  `image` VARCHAR(255) NOT NULL COMMENT '图片文件名',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample products
INSERT INTO `products` (`productName`, `category`, `quantity`, `price`, `image`) VALUES
('Apples', 'Fresh Food', 100, 1.50, 'apples.png'),
('Bananas', 'Fresh Food', 80, 0.80, 'bananas.png'),
('Milk', 'Beverages', 50, 3.50, 'milk.png'),
('Bread', 'Pantry', 60, 1.80, 'bread.png'),
('Tomatoes', 'Fresh Food', 75, 1.50, 'tomatoes.png'),
('Orange Juice', 'Beverages', 40, 4.50, 'orange_juice.png'),
('Rice', 'Pantry', 100, 8.90, 'rice.png'),
('Eggs', 'Fresh Food', 50, 3.20, 'eggs.png');

-- ========================================
-- Table: cart (购物车)
-- ========================================
DROP TABLE IF EXISTS `cart`;
CREATE TABLE `cart` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `users_id` INT(11) NOT NULL COMMENT '用户ID',
  `products_id` INT(11) NOT NULL COMMENT '商品ID',
  `quantity` INT(11) NOT NULL DEFAULT 1 COMMENT '数量',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cart_user` (`users_id`),
  KEY `idx_cart_product` (`products_id`),
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`users_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`products_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table: orders (订单主表)
-- ========================================
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL COMMENT '用户ID',
  `total` DECIMAL(10,2) NOT NULL COMMENT '订单小计',
  `status` VARCHAR(30) DEFAULT 'Pending' COMMENT '订单状态',
  `payment_method` VARCHAR(20) DEFAULT NULL COMMENT '支付方式',
  `payment_out_trade_no` VARCHAR(64) DEFAULT NULL COMMENT '支付交易号',
  `payment_provider_ref` VARCHAR(128) DEFAULT NULL COMMENT '支付商参考号',
  `paid_at` TIMESTAMP NULL COMMENT '支付时间',
  `voucher_id` INT(11) DEFAULT NULL COMMENT '使用的优惠券ID',
  `voucher_code` VARCHAR(20) DEFAULT NULL COMMENT '优惠码',
  `discount_amount` DECIMAL(10,2) DEFAULT 0 COMMENT '优惠金额',
  `final_total` DECIMAL(10,2) DEFAULT NULL COMMENT '最终金额',
  `shipment_status` VARCHAR(30) DEFAULT NULL COMMENT '物流状态',
  `refund_status` VARCHAR(30) DEFAULT NULL COMMENT '退款状态',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_orders_user` (`user_id`),
  KEY `idx_orders_status` (`status`),
  KEY `idx_orders_payment` (`payment_out_trade_no`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table: order_items (订单明细表)
-- ========================================
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL COMMENT '订单ID',
  `product_id` INT(11) NOT NULL COMMENT '商品ID',
  `product_name` VARCHAR(255) NOT NULL COMMENT '商品名称(快照)',
  `price` DECIMAL(10,2) NOT NULL COMMENT '单价(快照)',
  `quantity` INT(11) NOT NULL COMMENT '数量',
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table: membership_plans (会员套餐)
-- ========================================
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

-- Insert default membership plans
INSERT INTO `membership_plans` (`name`, `description`, `price`, `duration_days`, `voucher_count`, `voucher_type`, `voucher_value`, `voucher_min_order`) VALUES
('Bronze', 'Bronze membership - Get 2 x 10% off vouchers', 9.90, 30, 2, 'percentage', 10, 20),
('Silver', 'Silver membership - Get 3 x 15% off vouchers', 19.90, 30, 3, 'percentage', 15, 15),
('Gold', 'Gold membership - Get 5 x 20% off vouchers', 39.90, 30, 5, 'percentage', 20, 10);

-- ========================================
-- Table: user_memberships (用户会员记录)
-- ========================================
DROP TABLE IF EXISTS `user_memberships`;
CREATE TABLE `user_memberships` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL COMMENT '用户ID',
  `plan_id` INT(11) NOT NULL COMMENT '套餐ID',
  `status` ENUM('Pending', 'Active', 'Expired', 'Cancelled') DEFAULT 'Pending' COMMENT '状态',
  `payment_method` VARCHAR(20) DEFAULT NULL COMMENT '支付方式',
  `payment_ref` VARCHAR(100) DEFAULT NULL COMMENT '支付参考号',
  `started_at` TIMESTAMP NULL COMMENT '开始时间',
  `expires_at` TIMESTAMP NULL COMMENT '过期时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_membership_user` (`user_id`),
  KEY `idx_user_membership_plan` (`plan_id`),
  CONSTRAINT `fk_membership_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_membership_plan` FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table: vouchers (优惠券)
-- ========================================
DROP TABLE IF EXISTS `vouchers`;
CREATE TABLE `vouchers` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(20) NOT NULL COMMENT '优惠码',
  `user_id` INT(11) DEFAULT NULL COMMENT '所属用户(NULL为通用券)',
  `type` ENUM('percentage', 'fixed') NOT NULL DEFAULT 'percentage' COMMENT '类型',
  `value` DECIMAL(10,2) NOT NULL COMMENT '面值',
  `min_order` DECIMAL(10,2) DEFAULT 0 COMMENT '最低消费',
  `max_discount` DECIMAL(10,2) DEFAULT NULL COMMENT '最大折扣金额',
  `is_used` TINYINT(1) DEFAULT 0 COMMENT '是否已使用',
  `used_at` TIMESTAMP NULL COMMENT '使用时间',
  `used_order_id` INT(11) DEFAULT NULL COMMENT '使用的订单ID',
  `source` VARCHAR(50) DEFAULT 'membership' COMMENT '来源',
  `membership_id` INT(11) DEFAULT NULL COMMENT '关联会员记录',
  `expires_at` TIMESTAMP NULL COMMENT '过期时间',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_voucher_code` (`code`),
  KEY `idx_voucher_user` (`user_id`),
  CONSTRAINT `fk_voucher_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample promotional vouchers
INSERT INTO `vouchers` (`code`, `user_id`, `type`, `value`, `min_order`, `source`, `expires_at`) VALUES
('WELCOME10', NULL, 'percentage', 10, 20, 'promotion', DATE_ADD(NOW(), INTERVAL 90 DAY)),
('SAVE5', NULL, 'fixed', 5, 30, 'promotion', DATE_ADD(NOW(), INTERVAL 90 DAY));

-- ========================================
-- Table: shipments (物流记录)
-- ========================================
DROP TABLE IF EXISTS `shipments`;
CREATE TABLE `shipments` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL COMMENT '订单ID',
  `tracking_number` VARCHAR(50) DEFAULT NULL COMMENT '物流单号',
  `carrier` VARCHAR(50) DEFAULT 'HB Mart Express' COMMENT '承运商',
  `status` ENUM('Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed') DEFAULT 'Processing' COMMENT '物流状态',
  `estimated_delivery` DATE DEFAULT NULL COMMENT '预计送达日期',
  `shipped_at` TIMESTAMP NULL COMMENT '发货时间',
  `delivered_at` TIMESTAMP NULL COMMENT '送达时间',
  `recipient_name` VARCHAR(100) DEFAULT NULL COMMENT '收件人',
  `recipient_address` VARCHAR(255) DEFAULT NULL COMMENT '收件地址',
  `recipient_phone` VARCHAR(20) DEFAULT NULL COMMENT '收件电话',
  `notes` TEXT COMMENT '备注',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shipment_order` (`order_id`),
  KEY `idx_shipment_tracking` (`tracking_number`),
  CONSTRAINT `fk_shipment_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table: shipment_tracking (物流追踪记录)
-- ========================================
DROP TABLE IF EXISTS `shipment_tracking`;
CREATE TABLE `shipment_tracking` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `shipment_id` INT(11) NOT NULL COMMENT '物流ID',
  `status` VARCHAR(50) NOT NULL COMMENT '状态',
  `location` VARCHAR(100) DEFAULT NULL COMMENT '位置',
  `description` VARCHAR(255) NOT NULL COMMENT '描述',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tracking_shipment` (`shipment_id`),
  CONSTRAINT `fk_tracking_shipment` FOREIGN KEY (`shipment_id`) REFERENCES `shipments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- Table: refunds (退款记录)
-- ========================================
DROP TABLE IF EXISTS `refunds`;
CREATE TABLE `refunds` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `order_id` INT(11) NOT NULL COMMENT '订单ID',
  `user_id` INT(11) NOT NULL COMMENT '用户ID',
  `amount` DECIMAL(10,2) NOT NULL COMMENT '退款金额',
  `reason` ENUM('Damaged', 'Wrong Item', 'Not as Described', 'Changed Mind', 'Late Delivery', 'Other') NOT NULL COMMENT '退款原因',
  `description` TEXT COMMENT '详细描述',
  `status` ENUM('Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled') DEFAULT 'Pending' COMMENT '退款状态',
  `admin_note` TEXT COMMENT '管理员备注',
  `refund_method` VARCHAR(50) DEFAULT NULL COMMENT '退款方式',
  `refund_ref` VARCHAR(100) DEFAULT NULL COMMENT '退款参考号',
  `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `processed_at` TIMESTAMP NULL COMMENT '处理时间',
  `completed_at` TIMESTAMP NULL COMMENT '完成时间',
  `processed_by` INT(11) DEFAULT NULL COMMENT '处理人(管理员ID)',
  PRIMARY KEY (`id`),
  KEY `idx_refund_order` (`order_id`),
  KEY `idx_refund_user` (`user_id`),
  KEY `idx_refund_status` (`status`),
  CONSTRAINT `fk_refund_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refund_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- Schema creation complete!
-- Default accounts:
--   Admin: admin@hbmart.com / 123456
--   User:  user@hbmart.com / 123456
-- ========================================
