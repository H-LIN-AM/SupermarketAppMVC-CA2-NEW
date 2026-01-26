-- Update schema for order_items table
USE `c372_supermarketdb`;

-- Create order_items table if not exists
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_order_items_order` (`order_id`),
  KEY `fk_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Add status column to orders table (only if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' 
    AND TABLE_NAME = 'orders' 
    AND COLUMN_NAME = 'status');

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `orders` ADD COLUMN `status` varchar(20) DEFAULT ''Pending'' AFTER `total`', 
    'SELECT ''Column status already exists'' AS info');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add category column to products table (only if not exists)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'c372_supermarketdb' 
    AND TABLE_NAME = 'products' 
    AND COLUMN_NAME = 'category');

SET @query = IF(@col_exists = 0, 
    'ALTER TABLE `products` ADD COLUMN `category` varchar(50) DEFAULT ''General'' AFTER `productName`', 
    'SELECT ''Column category already exists'' AS info');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
