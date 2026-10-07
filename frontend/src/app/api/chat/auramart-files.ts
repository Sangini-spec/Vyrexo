export const AURAMART_TYPES_TS = `export type Department = "all" | "clothing" | "household" | "deals" | "bestsellers";

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
`;

export const AURAMART_PRODUCTS_TS = `import { Product } from "../types/store";

export const AURAMART_PRODUCTS: Product[] = [
  {
    id: "am-c1",
    name: "Classic Heavyweight Cotton Crewneck Tee",
    department: "clothing",
    price: 24.99,
    originalPrice: 32.0,
    rating: 4.8,
    reviewsCount: 420,
    prime: true,
    tag: "Best Seller",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    description: "Ultra-combed 240 GSM organic cotton t-shirt with tailored shoulder drop and reinforced collar.",
    stock: 85,
    features: ["100% Ring-Spun Cotton", "Pre-Shrunk Bio-Washed Fabric", "Ribbed Crew Neck", "Tagless Comfort"],
  },
  {
    id: "am-c2",
    name: "Tailored Flex Tech-Chino Trousers",
    department: "clothing",
    price: 58.5,
    originalPrice: 75.0,
    rating: 4.7,
    reviewsCount: 184,
    prime: true,
    tag: "Mega Deal",
    image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80",
    description: "4-way stretch performance chinos crafted for mobility, wrinkle-resistance, and all-day office comfort.",
    stock: 42,
    features: ["Moisture-Wicking Weave", "Concealed Zipper Stash Pocket", "Flexible Waistband", "Machine Washable"],
  },
  {
    id: "am-c3",
    name: "Oversized Merino Wool Blend Knit Sweater",
    department: "clothing",
    price: 64.0,
    originalPrice: 89.0,
    rating: 4.9,
    reviewsCount: 96,
    prime: true,
    tag: "Trending",
    image: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&auto=format&fit=crop&q=80",
    description: "Cozy cold-weather knit combining sustainable Merino wool with cloud-soft thermal yarn.",
    stock: 29,
    features: ["Warmth Without Bulk", "Rib-Knit Cuffs & Hem", "Natural Odor Resistance", "Sustainable Sourcing"],
  },
  {
    id: "am-c4",
    name: "Water-Resistant City Explorer Shell Jacket",
    department: "clothing",
    price: 89.99,
    originalPrice: 119.0,
    rating: 4.8,
    reviewsCount: 142,
    prime: true,
    image: "https://images.unsplash.com/photo-1544022613-e87ce7526edb?w=600&auto=format&fit=crop&q=80",
    description: "Lightweight windproof and drizzle-proof commuter parka with adjustable hood and taped seams.",
    stock: 36,
    features: ["10,000mm Hydrostatic Head", "Packable Into Internal Pocket", "YKK Aquaguard Zippers", "Reflective Accents"],
  },
  {
    id: "am-h1",
    name: "Ceramic Matte Pour-Over Kettle & Server Set",
    department: "household",
    price: 49.0,
    originalPrice: 65.0,
    rating: 4.9,
    reviewsCount: 310,
    prime: true,
    tag: "Best Seller",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
    description: "Precision gooseneck spout for optimal extraction control paired with a heat-resistant borosilicate carafe.",
    stock: 54,
    features: ["Precision Gooseneck Spout", "Ergonomic Walnut Handle", "Built-In Analog Thermometer", "Includes 40 Paper Filters"],
  },
  {
    id: "am-h2",
    name: "Stoneware Minimalist Ceramic Dinnerware (16-Piece)",
    department: "household",
    price: 119.99,
    originalPrice: 149.0,
    rating: 4.8,
    reviewsCount: 88,
    prime: true,
    tag: "Prime Exclusive",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=600&auto=format&fit=crop&q=80",
    description: "Service for 4 featuring scratch-resistant matte reactive glaze, organic rippled rims, and stackable profiles.",
    stock: 19,
    features: ["Microwave & Dishwasher Safe", "Chip-Resistant High-Fired Clay", "Set of 4 Plates, Bowls & Mugs", "Lead-Free Glazes"],
  },
  {
    id: "am-h3",
    name: "Natural Washed French Linen Sheet Set (Queen)",
    department: "household",
    price: 139.0,
    originalPrice: 179.0,
    rating: 4.9,
    reviewsCount: 265,
    prime: true,
    tag: "Mega Deal",
    image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80",
    description: "100% woven from French flax for temperature-regulating breathability that softens with every wash.",
    stock: 22,
    features: ["Pure Normandy Flax", "Deep 16\\" Pocket Fitted Sheet", "Breathable Year-Round", "Pre-Stone Washed"],
  },
  {
    id: "am-h4",
    name: "Smart Ultrasonic Ambient Mist Diffuser & Lamp",
    department: "household",
    price: 34.5,
    originalPrice: 45.0,
    rating: 4.6,
    reviewsCount: 512,
    prime: true,
    image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80",
    description: "Aromatherapy ultrasonic diffuser featuring warm candlelight LED ambiance and 12-hour continuous runtime.",
    stock: 77,
    features: ["Whisper-Quiet 24dB Operation", "Auto Shut-Off Safety Sensor", "300ml Water Reservoir", "Dual Mist Interval Modes"],
  },
];
`;

export const AURAMART_STORE_TSX = `"use client";

import React, { useState, useMemo } from "react";
import { AURAMART_PRODUCTS } from "../data/products";
import { Product, CartItem, Department, OrderRecord } from "../types/store";

export function EcommerceApp() {
  const [department, setDepartment] = useState<Department>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([
    { product: AURAMART_PRODUCTS[0], quantity: 1, selectedSize: "M", selectedColor: "Heather Charcoal" },
  ]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [activeOrder, setActiveOrder] = useState<OrderRecord | null>(null);
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);

  // Filter products by department and search
  const filteredProducts = useMemo(() => {
    return AURAMART_PRODUCTS.filter((p) => {
      const matchDept =
        department === "all" ||
        (department === "clothing" && p.department === "clothing") ||
        (department === "household" && p.department === "household") ||
        (department === "deals" && (p.tag === "Mega Deal" || p.originalPrice)) ||
        (department === "bestsellers" && p.tag === "Best Seller");

      const matchSearch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.features.some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchDept && matchSearch;
    });
  }, [department, searchQuery]);

  // Calculations
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const rawSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = (rawSubtotal * discountPercent) / 100;
  const subtotalAfterDiscount = rawSubtotal - discountAmount;
  const freeShippingThreshold = 35.0;
  const isFreeShipping = subtotalAfterDiscount >= freeShippingThreshold;
  const shippingCost = cart.length === 0 ? 0 : isFreeShipping ? 0 : 5.99;
  const estimatedTax = subtotalAfterDiscount * 0.0825;
  const grandTotal = cart.length === 0 ? 0 : subtotalAfterDiscount + shippingCost + estimatedTax;

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, selectedSize: "M", selectedColor: "Standard" }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === "AURAPRO15" || code === "PRIME15") {
      setDiscountPercent(15);
      setCouponFeedback({ message: "Coupon applied: 15% discount unlocked!", type: "success" });
    } else if (code === "WELCOME20") {
      setDiscountPercent(20);
      setCouponFeedback({ message: "Welcome promo applied: 20% off!", type: "success" });
    } else {
      setCouponFeedback({ message: "Invalid voucher code. Try \\"AURAPRO15\\" or \\"WELCOME20\\".", type: "error" });
    }
  };

  const placeOrder = () => {
    if (cart.length === 0) return;
    const order: OrderRecord = {
      orderId: "AM-" + Math.floor(100000 + Math.random() * 900000),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      items: [...cart],
      subtotal: rawSubtotal,
      shipping: shippingCost,
      tax: estimatedTax,
      total: grandTotal,
      status: "Confirmed",
      address: "1042 Market Promenade, Suite 4B, San Francisco, CA",
    };
    setActiveOrder(order);
    setCart([]);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setDepartment("all")}>
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-md shadow-amber-500/20">
              🛒
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-white">Aura<span className="text-amber-400">Mart</span></span>
                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  PRIME
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Clothes & Household Store</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl hidden md:flex items-center">
            <div className="relative w-full flex">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clothes, sheets, dinnerware, outerwear, essentials..."
                className="w-full bg-slate-950 border border-slate-700 px-4 py-2 text-sm rounded-l-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 font-bold text-sm rounded-r-lg transition-colors">
                🔍
              </button>
            </div>
          </div>

          {/* Actions & Cart Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm"
            >
              <span className="text-amber-400 text-base">🛍️</span>
              <span className="bg-amber-500 text-slate-950 text-xs font-black px-1.5 py-0.5 rounded-full">
                {cartItemCount}
              </span>
              <span className="hidden sm:inline font-bold">\${subtotalAfterDiscount.toFixed(2)}</span>
            </button>
          </div>
        </div>

        {/* DEPARTMENT STRIP */}
        <div className="bg-slate-950/80 border-t border-slate-800 px-4 sm:px-6 py-2 overflow-x-auto">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "All Departments" },
                { id: "clothing", label: "Clothes & Apparel" },
                { id: "household", label: "Household & Living" },
                { id: "deals", label: "🔥 Today's Mega Deals" },
                { id: "bestsellers", label: "⭐ Best Sellers" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setDepartment(tab.id as Department)}
                  className={\`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap \${
                    department === tab.id
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "hover:bg-slate-800 text-slate-300"
                  }\`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-amber-400 font-semibold hidden lg:inline">
              🚚 Free Express Prime Delivery on orders over \$35
            </span>
          </div>
        </div>
      </header>

      {/* ACTIVE ORDER CONFIRMATION BANNER */}
      {activeOrder && (
        <div className="bg-emerald-950/60 border-b border-emerald-800/80 px-4 py-3 text-emerald-200 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <span>
                <strong>Order {activeOrder.orderId} Placed!</strong> Total: \${activeOrder.total.toFixed(2)} — Delivering to {activeOrder.address}
              </span>
            </div>
            <button
              onClick={() => setActiveOrder(null)}
              className="px-2.5 py-1 rounded bg-emerald-900 hover:bg-emerald-800 text-white font-medium text-[11px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MAIN CATALOG */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {department === "clothing"
                ? "Men's & Women's Clothing"
                : department === "household"
                ? "Household & Kitchen Essentials"
                : department === "deals"
                ? "Today's Featured Deals"
                : "Curated Store Catalog"}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Showing {filteredProducts.length} items with guaranteed 1-day Prime fulfillment
            </p>
          </div>

          <span className="text-xs font-medium text-slate-400">
            Use code <code className="text-amber-400 font-bold bg-slate-900 px-2 py-0.5 rounded">AURAPRO15</code> for 15% off
          </span>
        </div>

        {/* PRODUCT GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all flex flex-col shadow-sm group"
            >
              {/* Image & Badges */}
              <div className="relative h-48 bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setQuickProduct(product)}>
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {product.tag && (
                  <span className="absolute top-2.5 left-2.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded shadow">
                    {product.tag}
                  </span>
                )}
                {product.prime && (
                  <span className="absolute top-2.5 right-2.5 bg-sky-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                    Prime
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-400 text-xs mb-1">
                    <span>★</span>
                    <span className="font-bold text-slate-200">{product.rating}</span>
                    <span className="text-slate-500">({product.reviewsCount})</span>
                  </div>
                  <h3
                    className="font-bold text-sm text-white line-clamp-2 hover:text-amber-400 cursor-pointer transition-colors"
                    onClick={() => setQuickProduct(product)}
                  >
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{product.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-white">\${product.price.toFixed(2)}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-slate-500 line-through">
                          \${product.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-400 font-semibold">In Stock ({product.stock})</span>
                  </div>

                  <button
                    onClick={() => addToCart(product)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shadow-sm"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* QUICK VIEW MODAL */}
      {quickProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 relative shadow-2xl">
            <button
              onClick={() => setQuickProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            <div className="flex gap-4">
              <img src={quickProduct.image} alt={quickProduct.name} className="w-32 h-32 object-cover rounded-xl" />
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">{quickProduct.department}</span>
                <h3 className="text-base font-bold text-white mt-1">{quickProduct.name}</h3>
                <div className="text-lg font-black text-white mt-1">\${quickProduct.price.toFixed(2)}</div>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-4">{quickProduct.description}</p>
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Specifications</h4>
              <ul className="space-y-1">
                {quickProduct.features.map((f, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                    <span className="text-amber-400">•</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => {
                addToCart(quickProduct);
                setQuickProduct(null);
              }}
              className="mt-6 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              Add to Cart — \${quickProduct.price.toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* SLIDE-OUT CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
          <div className="fixed inset-y-0 right-0 max-w-md w-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛍️</span>
                <h2 className="text-base font-bold text-white">Your Shopping Cart ({cartItemCount})</h2>
              </div>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">
                ✕
              </button>
            </div>

            {/* Free Shipping Progress */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300">
                  {isFreeShipping ? "🎉 You unlocked FREE Prime Shipping!" : \`Add \$\${(freeShippingThreshold - subtotalAfterDiscount).toFixed(2)} more for Free Shipping\`}
                </span>
                <span className="text-[10px] text-amber-400 font-bold">\$35 Goal</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: \`\${Math.min(100, (subtotalAfterDiscount / freeShippingThreshold) * 100)}%\` }}
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Your shopping cart is empty. Add products from the catalog!
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <img src={item.product.image} alt={item.product.name} className="w-16 h-16 object-cover rounded-lg" />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-white line-clamp-1">{item.product.name}</h4>
                      <div className="text-xs font-black text-amber-400 mt-0.5">\${item.product.price.toFixed(2)}</div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="text-xs text-slate-400 hover:text-white font-bold"
                          >
                            −
                          </button>
                          <span className="text-xs font-bold text-white px-1">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="text-xs text-slate-400 hover:text-white font-bold"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-xs font-bold text-slate-300">
                          \${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Coupon and Summary */}
            {cart.length > 0 && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
                {/* Promo Code Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Coupon code (AURAPRO15)"
                    className="flex-1 bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs rounded-lg text-white uppercase focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={applyCoupon}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors border border-slate-700"
                  >
                    Apply
                  </button>
                </div>
                {couponFeedback && (
                  <p className={\`text-[11px] \${couponFeedback.type === "success" ? "text-emerald-400" : "text-rose-400"}\`}>
                    {couponFeedback.message}
                  </p>
                )}

                {/* Subtotal breakdown */}
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>\${rawSubtotal.toFixed(2)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Discount ({discountPercent}%)</span>
                      <span>−\${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>{shippingCost === 0 ? "FREE" : \`\$\${shippingCost.toFixed(2)}\`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax (8.25%)</span>
                    <span>\${estimatedTax.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-black text-white">
                    <span>Total</span>
                    <span className="text-amber-400">\${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={placeOrder}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl text-sm transition-colors shadow-lg shadow-amber-500/20"
                >
                  Place Prime Order — \${grandTotal.toFixed(2)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
`;
