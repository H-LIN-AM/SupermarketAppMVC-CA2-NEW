/*
 Navicat Premium Data Transfer

 Source Server         : lmy
 Source Server Type    : MySQL
 Source Server Version : 50731 (5.7.31-log)
 Source Host           : localhost:3306
 Source Schema         : c372_supermarketdb

 Target Server Type    : MySQL
 Target Server Version : 50731 (5.7.31-log)
 File Encoding         : 65001

 Date: 29/11/2025 01:29:19
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for cart
-- ----------------------------
DROP TABLE IF EXISTS `cart`;
CREATE TABLE `cart`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `users_id` int(11) NOT NULL,
  `products_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_cart_user`(`users_id`) USING BTREE,
  INDEX `fk_cart_product`(`products_id`) USING BTREE,
  CONSTRAINT `fk_cart_product` FOREIGN KEY (`products_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cart_user` FOREIGN KEY (`users_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cart
-- ----------------------------
INSERT INTO `cart` VALUES (3, 17, 2, 2, '2025-11-29 01:10:21', '2025-11-29 01:10:21');
INSERT INTO `cart` VALUES (5, 17, 4, 1, '2025-11-29 01:10:36', '2025-11-29 01:10:36');

-- ----------------------------
-- Table structure for order_items
-- ----------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(10, 2) NOT NULL,
  `quantity` int(11) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_order_items_order_id`(`order_id`) USING BTREE,
  INDEX `idx_order_items_product_id`(`product_id`) USING BTREE,
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 28 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of order_items
-- ----------------------------
INSERT INTO `order_items` VALUES (17, 16, 3, 'Milk', 3.50, 1);
INSERT INTO `order_items` VALUES (18, 17, 1, 'Apples', 1.50, 1);
INSERT INTO `order_items` VALUES (19, 18, 2, 'Bananas', 0.80, 1);
INSERT INTO `order_items` VALUES (20, 19, 3, 'Milk', 3.50, 1);
INSERT INTO `order_items` VALUES (21, 19, 2, 'Bananas', 0.80, 1);
INSERT INTO `order_items` VALUES (22, 20, 2, 'Bananas', 0.80, 1);
INSERT INTO `order_items` VALUES (23, 21, 3, 'Milk', 3.50, 1);
INSERT INTO `order_items` VALUES (24, 22, 2, 'Bananas', 0.80, 1);
INSERT INTO `order_items` VALUES (25, 23, 2, 'Bananas', 0.80, 1);
INSERT INTO `order_items` VALUES (26, 24, 2, 'Bananas', 0.80, 1);
INSERT INTO `order_items` VALUES (27, 25, 2, 'Bananas', 0.80, 2);

-- ----------------------------
-- Table structure for orders
-- ----------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `total` decimal(10, 2) NOT NULL,
  `status` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci NULL DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `fk_orders_user`(`user_id`) USING BTREE,
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 26 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of orders
-- ----------------------------
INSERT INTO `orders` VALUES (1, 17, 3.00, 'Pending', '2025-11-19 17:15:14');
INSERT INTO `orders` VALUES (2, 17, 3.00, 'Pending', '2025-11-19 17:15:15');
INSERT INTO `orders` VALUES (3, 17, 3.00, 'Pending', '2025-11-19 17:15:15');
INSERT INTO `orders` VALUES (4, 17, 0.80, 'Pending', '2025-11-19 17:16:02');
INSERT INTO `orders` VALUES (5, 17, 0.80, 'Pending', '2025-11-19 17:16:05');
INSERT INTO `orders` VALUES (6, 17, 0.80, 'Pending', '2025-11-19 17:16:05');
INSERT INTO `orders` VALUES (7, 17, 0.80, 'Pending', '2025-11-19 17:16:06');
INSERT INTO `orders` VALUES (8, 17, 0.80, 'Pending', '2025-11-19 17:16:06');
INSERT INTO `orders` VALUES (9, 17, 0.80, 'Pending', '2025-11-19 17:16:07');
INSERT INTO `orders` VALUES (10, 17, 0.80, 'Pending', '2025-11-19 17:16:07');
INSERT INTO `orders` VALUES (11, 17, 0.80, 'Pending', '2025-11-19 17:16:08');
INSERT INTO `orders` VALUES (12, 17, 0.80, 'Pending', '2025-11-19 17:25:45');
INSERT INTO `orders` VALUES (13, 17, 0.80, 'Pending', '2025-11-19 17:25:52');
INSERT INTO `orders` VALUES (14, 17, 3.00, 'Pending', '2025-11-20 09:05:17');
INSERT INTO `orders` VALUES (15, 17, 3.00, 'Pending', '2025-11-20 09:10:57');
INSERT INTO `orders` VALUES (16, 17, 3.00, 'Pending', '2025-11-20 09:15:25');
INSERT INTO `orders` VALUES (17, 17, 0.80, 'Pending', '2025-11-20 09:23:17');
INSERT INTO `orders` VALUES (18, 17, 0.80, 'Pending', '2025-11-20 09:23:24');
INSERT INTO `orders` VALUES (19, 17, 0.80, 'Pending', '2025-11-20 09:28:42');
INSERT INTO `orders` VALUES (20, 17, 0.80, 'Pending', '2025-11-20 09:29:34');
INSERT INTO `orders` VALUES (21, 17, 3.50, 'Pending', '2025-11-22 22:53:24');
INSERT INTO `orders` VALUES (22, 17, 0.80, 'Pending', '2025-11-22 22:53:35');
INSERT INTO `orders` VALUES (23, 17, 0.80, 'Pending', '2025-11-22 23:16:27');
INSERT INTO `orders` VALUES (24, 17, 0.80, 'Pending', '2025-11-24 01:46:01');
INSERT INTO `orders` VALUES (25, 17, 1.60, 'Pending', '2025-11-29 00:55:13');

-- ----------------------------
-- Table structure for products
-- ----------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `productName` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'General',
  `quantity` int(11) NOT NULL,
  `price` double(10, 2) NOT NULL,
  `image` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 26 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of products
-- ----------------------------
INSERT INTO `products` VALUES (1, 'Apples', 'Fresh Food', 50, 1.50, 'apples.png');
INSERT INTO `products` VALUES (2, 'Bananas', 'Fresh Food', 72, 0.80, 'bananas.png');
INSERT INTO `products` VALUES (3, 'Milk', 'Beverages', 50, 3.50, 'milk.png');
INSERT INTO `products` VALUES (4, 'Bread', 'Pantry', 80, 1.80, 'bread.png');
INSERT INTO `products` VALUES (14, 'Tomatoes', 'Fresh Food', 80, 1.50, 'tomatoes.png');
INSERT INTO `products` VALUES (24, 'milk', 'Beverages', 200, 9.00, 'broccoli2.jpg');
INSERT INTO `products` VALUES (25, '123', 'General', 12, 123.00, 'å¾®ä¿¡å¾ç_20251120093419_136_1240.png');

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(20) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `email` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `password` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `address` varchar(255) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `contact` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  `role` varchar(10) CHARACTER SET latin1 COLLATE latin1_swedish_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = latin1 COLLATE = latin1_swedish_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'Peter Lim', 'peter@peter.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'Woodlands Ave 2', '98765432', 'admin');
INSERT INTO `users` VALUES (2, 'Mary Tan', 'mary@mary.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'Tampines Ave 1', '12345678', 'user');
INSERT INTO `users` VALUES (3, 'bobochan', 'bobochan@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'Woodlands', '98765432', 'user');
INSERT INTO `users` VALUES (4, 'sarahlee', 'sarahlee@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'Woodlands', '98765432', 'user');
INSERT INTO `users` VALUES (5, 'HL', 'linhongbo6@gmail.com', 'c984aed014aec7623a54f0591da07a85fd4b762d', 'Jalan Kembangan', '91753698', 'user');
INSERT INTO `users` VALUES (6, 'Henrygiao', '23007856@myrp.edu.sg', 'c984aed014aec7623a54f0591da07a85fd4b762d', '28 Woodlands Drive 16,Blk 28 Forestville #13-18', '91753698', 'admin');
INSERT INTO `users` VALUES (7, 'sk', 'sk120@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'bukit', '123445', 'user');
INSERT INTO `users` VALUES (8, 'HL', 'linhongbo6@gmail.com', 'c984aed014aec7623a54f0591da07a85fd4b762d', '38 Woodlands Drive 16,Blk 28 Forestville #13-18', '91753698', 'admin');
INSERT INTO `users` VALUES (9, 'sq', 'sq123@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'bukit', '1234423', 'admin');
INSERT INTO `users` VALUES (10, '1653398', 'linhongbo6@gmail.com', 'c984aed014aec7623a54f0591da07a85fd4b762d', '38 Woodlands Drive 16,Blk 28 Forestville #13-18', '91753698', 'user');
INSERT INTO `users` VALUES (11, 'HL', '12@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'Jalan Kembangan', '91753698', 'admin');
INSERT INTO `users` VALUES (12, 'HLhhhggggj', 'wjk@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'bukit', '112312', 'user');
INSERT INTO `users` VALUES (13, 'Henrygiao', 'henry@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'bukit', '123456', 'admin');
INSERT INTO `users` VALUES (14, 'Henrygiao', 'henry@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'bukit', '123456', 'user');
INSERT INTO `users` VALUES (15, 'Henrygiao', 'henry@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'bukit', '123456', 'user');
INSERT INTO `users` VALUES (16, 'hjk', 'hjk@gmail.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', 'bukit', '123456', 'user');
INSERT INTO `users` VALUES (17, 'admin', '23@qq.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', '123', '123', 'user');
INSERT INTO `users` VALUES (18, '123', '123@qq.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', '1234', '123', 'admin');
INSERT INTO `users` VALUES (19, '1212', '1212@qq.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', '1', '12345678', 'user');
INSERT INTO `users` VALUES (20, 'hhh', '233333@qq.com', '7c4a8d09ca3762af61e59520943dc26494f8941b', '123', '12345667', 'admin');

SET FOREIGN_KEY_CHECKS = 1;
