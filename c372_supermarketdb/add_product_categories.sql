-- Add categories to existing products
USE `c372_supermarketdb`;

-- Update existing products with appropriate categories
UPDATE products SET category = 'Fresh Food' WHERE productName IN ('Apples', 'Bananas', 'Tomatoes');
UPDATE products SET category = 'Beverages' WHERE productName LIKE '%milk%' OR productName LIKE '%Milk%';
UPDATE products SET category = 'Pantry' WHERE productName IN ('Bread');

-- Show updated products
SELECT id, productName, category, quantity, price FROM products ORDER BY category, productName;
