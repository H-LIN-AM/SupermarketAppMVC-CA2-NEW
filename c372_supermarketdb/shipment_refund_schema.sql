-- ========================================
-- Shipment & Refund System Schema
-- Run this script to add shipment tracking and refund tables
-- ========================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table: shipments (物流记录)
-- ----------------------------
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

-- ----------------------------
-- Table: shipment_tracking (物流追踪记录)
-- ----------------------------
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

-- ----------------------------
-- Table: refunds (退款记录)
-- ----------------------------
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

-- ----------------------------
-- Alter orders table: add shipment and refund status fields
-- ----------------------------
ALTER TABLE `orders`
ADD COLUMN `shipment_status` VARCHAR(30) DEFAULT NULL COMMENT '物流状态',
ADD COLUMN `refund_status` VARCHAR(30) DEFAULT NULL COMMENT '退款状态';

SET FOREIGN_KEY_CHECKS = 1;
