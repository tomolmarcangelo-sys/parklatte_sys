import { db } from './src/lib/firebase';
import { collection, addDoc, getDocs, writeBatch, doc } from 'firebase/firestore';
import { sanitize } from './src/lib/utils';

const products = [
  { name: 'Caffe Latte', price: 4.50, category: 'Coffee', available: true },
  { name: 'Cappuccino', price: 4.25, category: 'Coffee', available: true },
  { name: 'Americano', price: 3.50, category: 'Coffee', available: true },
  { name: 'Matcha Latte', price: 5.25, category: 'Tea', available: true },
  { name: 'Cold Brew', price: 4.00, category: 'Coffee', available: true },
  { name: 'Caramel Macchiato', price: 5.50, category: 'Coffee', available: true },
];

const customizations = [
  { name: 'Oat Milk', additionalPrice: 0.80, stockLevel: 20, threshold: 5 },
  { name: 'Almond Milk', additionalPrice: 0.80, stockLevel: 15, threshold: 5 },
  { name: 'Extra Shot', additionalPrice: 1.00, stockLevel: 100, threshold: 20 },
  { name: 'Vanilla Syrup', additionalPrice: 0.50, stockLevel: 4, threshold: 10 },
  { name: 'Caramel Drizzle', additionalPrice: 0.50, stockLevel: 8, threshold: 10 },
];

async function seed() {
  console.log('Seeding data...');
  
  // Products
  const productSnap = await getDocs(collection(db, 'products'));
  if (productSnap.empty) {
    for (const p of products) {
      await addDoc(collection(db, 'products'), sanitize(p));
    }
    console.log('Products seeded');
  }

  // Customizations
  const customSnap = await getDocs(collection(db, 'customizations'));
  if (customSnap.empty) {
    for (const c of customizations) {
      await addDoc(collection(db, 'customizations'), sanitize(c));
    }
    console.log('Customizations seeded');
  }

  console.log('Seeding complete');
}

seed().catch(console.error);
