export type UserRole = 'Customer' | 'Barista' | 'Admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  imageUrl?: string;
  available: boolean;
}

export interface CustomizationOption {
  id: string;
  name: string;
  additionalPrice: number;
  stockLevel: number;
  threshold: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  customizationIds: string[];
  customizations: { name: string; price: number }[];
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Completed' | 'PickedUp' | 'Cancelled';

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  totalPrice: number;
  timestamp: string;
  items: OrderItem[];
}
