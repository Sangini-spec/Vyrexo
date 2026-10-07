export type SkinType = "all" | "sensitive" | "dry" | "oily" | "mature";

export type ProductCategory =
  | "all"
  | "facial_kits"
  | "serums"
  | "cleansers"
  | "masks"
  | "lip_eye";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  skinType: SkinType;
  price: number;
  rating: number;
  reviewsCount: number;
  tag?: string;
  image: string;
  description: string;
  keyIngredients: string[];
  clinicalBenefits: string;
  directions: string;
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderDetails {
  orderId: string;
  customerName: string;
  email: string;
  address: string;
  totalAmount: number;
  items: CartItem[];
  status: "placed" | "lab_formulation" | "quality_audit" | "dispatched";
}
