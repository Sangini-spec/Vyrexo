export type Department = "all" | "clothing" | "household" | "deals" | "bestsellers";

export interface Product {
  id: string;
  name: string;
  department: "clothing" | "household";
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  prime: boolean;
  tag?: string;
  image: string;
  description: string;
  stock: number;
  features: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface OrderRecord {
  orderId: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: "Confirmed" | "Preparing" | "Shipped" | "Delivered";
  address: string;
}
