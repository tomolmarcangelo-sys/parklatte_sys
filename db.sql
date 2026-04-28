-- Coffee Shop Management System MySQL Schema

CREATE DATABASE IF NOT EXISTS coffee_shop;
USE coffee_shop;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('Customer', 'Barista', 'Admin') DEFAULT 'Customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(255) NOT NULL,
  imageUrl TEXT,
  available BOOLEAN DEFAULT TRUE
);

-- Customization Options Table
CREATE TABLE IF NOT EXISTS customization_options (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  additionalPrice DECIMAL(10, 2) NOT NULL,
  stockLevel INT DEFAULT 0,
  threshold INT DEFAULT 5
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(255) PRIMARY KEY,
  customerId VARCHAR(255) NOT NULL,
  customerName VARCHAR(255) NOT NULL,
  status ENUM('Pending', 'Preparing', 'Completed', 'PickedUp', 'Cancelled') DEFAULT 'Pending',
  totalPrice DECIMAL(10, 2) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES users(id)
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId VARCHAR(255) NOT NULL,
  productId VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
);

-- Order Item Customizations
CREATE TABLE IF NOT EXISTS order_item_customizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderItemId INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (orderItemId) REFERENCES order_items(id) ON DELETE CASCADE
);

-- Initial Data
INSERT IGNORE INTO users (id, name, email, password, role) VALUES 
('admin-id', 'Admin User', 'tomolmarcangelo@gmail.com', '$2a$10$YourHashedPasswordHere', 'Admin');

INSERT IGNORE INTO menu_items (id, name, price, category, imageUrl, available) VALUES
('espresso', 'Espresso', 120.00, 'Coffee', 'https://images.unsplash.com/photo-1510707513152-4560adb7c3ed?w=800', 1),
('latte', 'Latte', 150.00, 'Coffee', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=800', 1),
('capuccino', 'Capuccino', 150.00, 'Coffee', 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=800', 1);

INSERT IGNORE INTO customization_options (id, name, additionalPrice, stockLevel, threshold) VALUES
('extra-shot', 'Extra Shot', 30.00, 100, 10),
('oat-milk', 'Oat Milk', 40.00, 50, 5),
('vanilla-syrup', 'Vanilla Syrup', 20.00, 80, 5);
