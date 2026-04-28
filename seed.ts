import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'coffee_shop',
};

const products = [
  { id: uuidv4(), name: 'Caffe Latte', price: 150.00, category: 'Coffee', available: true },
  { id: uuidv4(), name: 'Cappuccino', price: 150.00, category: 'Coffee', available: true },
  { id: uuidv4(), name: 'Americano', price: 120.00, category: 'Coffee', available: true },
  { id: uuidv4(), name: 'Matcha Latte', price: 180.00, category: 'Tea', available: true },
  { id: uuidv4(), name: 'Cold Brew', price: 140.00, category: 'Coffee', available: true },
  { id: uuidv4(), name: 'Caramel Macchiato', price: 170.00, category: 'Coffee', available: true },
];

const customizations = [
  { id: uuidv4(), name: 'Oat Milk', additionalPrice: 40.00, stockLevel: 20, threshold: 5 },
  { id: uuidv4(), name: 'Almond Milk', additionalPrice: 40.00, stockLevel: 15, threshold: 5 },
  { id: uuidv4(), name: 'Extra Shot', additionalPrice: 30.00, stockLevel: 100, threshold: 20 },
  { id: uuidv4(), name: 'Vanilla Syrup', additionalPrice: 20.00, stockLevel: 80, threshold: 10 },
  { id: uuidv4(), name: 'Caramel Drizzle', additionalPrice: 20.00, stockLevel: 80, threshold: 10 },
];

async function seed() {
  console.log('Seeding MySQL data...');
  const connection = await mysql.createConnection(dbConfig);

  try {
    // Products
    const [rows]: any = await connection.execute('SELECT COUNT(*) as count FROM menu_items');
    if (rows[0].count === 0) {
      for (const p of products) {
        await connection.execute(
          'INSERT INTO menu_items (id, name, price, category, available) VALUES (?, ?, ?, ?, ?)',
          [p.id, p.name, p.price, p.category, p.available]
        );
      }
      console.log('Products seeded');
    } else {
      console.log('Products table not empty, skipping.');
    }

    // Customizations
    const [crows]: any = await connection.execute('SELECT COUNT(*) as count FROM customization_options');
    if (crows[0].count === 0) {
      for (const c of customizations) {
        await connection.execute(
          'INSERT INTO customization_options (id, name, additionalPrice, stockLevel, threshold) VALUES (?, ?, ?, ?, ?)',
          [c.id, c.name, c.additionalPrice, c.stockLevel, c.threshold]
        );
      }
      console.log('Customizations seeded');
    } else {
      console.log('Customizations table not empty, skipping.');
    }

    console.log('Seeding complete');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await connection.end();
  }
}

seed().catch(console.error);
