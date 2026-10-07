export const COSMETICS_TYPES_TS = `export type SkinType = "all" | "sensitive" | "dry" | "oily" | "mature";

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
`;

export const COSMETICS_PRODUCTS_TS = `import { Product } from "../types/cosmetics";

export const COSMETICS_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Radiance Revival 5-Step Clinical Facial Kit",
    category: "facial_kits",
    skinType: "all",
    price: 84.0,
    rating: 4.9,
    reviewsCount: 238,
    tag: "Bestseller",
    image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80",
    description: "Complete salon-grade botanical facial system: micro-exfoliating enzyme polish, balancing toner mist, youth concentrate, barrier lipid cream, and gua sha stone.",
    keyIngredients: ["Papaya Enzymes", "Gotu Kola", "Rose Damascena", "Phyto-Ceramides"],
    clinicalBenefits: "Clinically proven to improve skin radiance by 41% and skin barrier elasticity by 29% in 14 days.",
    directions: "Use weekly. Follow sequentially: Step 1 Cleanse -> Step 2 Polish -> Step 3 Mist -> Step 4 Serum -> Step 5 Barrier Seal.",
    inStock: true,
  },
  {
    id: "prod-2",
    name: "Pure Hydration 2% Multi-Molecular Hyaluronic Serum",
    category: "serums",
    skinType: "dry",
    price: 46.0,
    rating: 4.8,
    reviewsCount: 312,
    tag: "Award Winner",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80",
    description: "Quad-weight hyaluronic acid complex paired with snow mushroom extract for deep cellular hydration across all four epidermal layers.",
    keyIngredients: ["Multi-Molecular Hyaluronic Acid", "Tremella Fuciformis", "Panthenol B5"],
    clinicalBenefits: "Delivers immediate 72-hour moisture reservoir retention with zero stickiness or residue.",
    directions: "Press 3-4 drops into damp facial skin morning and night before heavier face creams.",
    inStock: true,
  },
  {
    id: "prod-3",
    name: "Barrier Calm Centella & Cica Soothing Emulsion",
    category: "serums",
    skinType: "sensitive",
    price: 52.0,
    rating: 4.9,
    reviewsCount: 184,
    tag: "Derm Approved",
    image: "https://images.unsplash.com/photo-1608248597358-00a455a40a8a?w=600&auto=format&fit=crop&q=80",
    description: "Bio-fermented Centella Asiatica paired with medical-grade colloidal oat lipids to instantly eliminate erythema, redness, and reactive stinging.",
    keyIngredients: ["Centella Asiatica (82%)", "Madecassoside", "Colloidal Oatmeal", "Allantoin"],
    clinicalBenefits: "Calms reactive skin and reduces surface transepidermal water loss by 58% in 30 minutes.",
    directions: "Gently pat a dime-sized amount onto sensitized or compromised facial barrier zones.",
    inStock: true,
  },
  {
    id: "prod-4",
    name: "Clarifying Matcha Tea & Niacinamide Gel Cleanser",
    category: "cleansers",
    skinType: "oily",
    price: 34.0,
    rating: 4.7,
    reviewsCount: 156,
    image: "https://images.unsplash.com/photo-1556228722-d0b5d15a5135?w=600&auto=format&fit=crop&q=80",
    description: "Sulfate-free pH 5.5 micro-cleanser loaded with antioxidant green tea polyphenols and 4% Niacinamide to normalize pore sebum production.",
    keyIngredients: ["Uji Ceremonial Matcha", "4% Niacinamide", "Willow Bark Extract", "Zinc PCA"],
    clinicalBenefits: "Purifies pores without barrier stripping or dryness, regulating sebum production throughout the day.",
    directions: "Emulsify a pump between wet palms, massage over damp face for 60 seconds, and rinse with lukewarm water.",
    inStock: true,
  },
  {
    id: "prod-5",
    name: "Botanical Bakuchiol & Rosehip Youth Elixir",
    category: "serums",
    skinType: "mature",
    price: 68.0,
    rating: 4.9,
    reviewsCount: 204,
    tag: "Natural Retinol",
    image: "https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=80",
    description: "A 100% natural, pregnancy-safe plant-derived alternative to Retinol that stimulates pro-collagen synthesis without flaking or UV sensitivity.",
    keyIngredients: ["Bakuchiol (1.5%)", "Organic Cold-Pressed Rosehip", "Sea Buckthorn Berry"],
    clinicalBenefits: "Clinically demonstrated 28% reduction in fine line depth after 6 weeks of continuous nocturnal application.",
    directions: "Warm 3 drops between fingertips and gently press into clean skin at night.",
    inStock: true,
  },
  {
    id: "prod-6",
    name: "Velvet Cloud Ceramide Barrier Melt Mask",
    category: "masks",
    skinType: "dry",
    price: 48.0,
    rating: 4.8,
    reviewsCount: 119,
    image: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80",
    description: "An overnight restorative lipid melt that locks in hydration, repairs the stratum corneum, and leaves skin bouncy and supple by sunrise.",
    keyIngredients: ["Ceramides NP/AP/EOP", "Organic Shea Butter", "Squalane", "Beta-Glucan"],
    clinicalBenefits: "Locks in 94% moisture overnight while restoring vital lipid barrier integrity.",
    directions: "Apply a generous layer as the final step of your evening ritual. Leave on overnight; rinse lightly at morning.",
    inStock: true,
  },
  {
    id: "prod-7",
    name: "Peptide Firming Eye Contour & Botanical Lip Balm",
    category: "lip_eye",
    skinType: "all",
    price: 39.0,
    rating: 4.7,
    reviewsCount: 97,
    image: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&auto=format&fit=crop&q=80",
    description: "Targeted contour recovery duo infused with caffeine, copper tripeptides, and botanical mango butter to depuff dark circles and plump dry lips.",
    keyIngredients: ["Copper Tripeptide-1", "Green Coffee Seed Oil", "Mango Butter", "Vegan Collagen"],
    clinicalBenefits: "Visibly decreases orbital puffiness within 15 minutes and restores lip contour volume.",
    directions: "Dab delicately around orbital bone and smooth generously over lips.",
    inStock: true,
  },
  {
    id: "prod-8",
    name: "Detoxifying French Green Clay Pore Refinement Mask",
    category: "masks",
    skinType: "oily",
    price: 38.0,
    rating: 4.8,
    reviewsCount: 142,
    image: "https://images.unsplash.com/photo-1567928815116-f00c5c3e070e?w=600&auto=format&fit=crop&q=80",
    description: "Artisanal French montmorillonite green clay and botanical tea tree oil designed to magnetically lift cellular debris, excess oil, and impurities.",
    keyIngredients: ["French Montmorillonite Clay", "Tea Tree Leaf Oil", "Organic Aloe Vera", "Spirulina"],
    clinicalBenefits: "Refines pore appearance by 34% in one treatment without over-drying.",
    directions: "Smooth an opaque layer over clean T-zone. Allow 10 minutes to dry; rinse cleanly with warm cloth.",
    inStock: true,
  },
];
`;

export const COSMETICS_STORE_TSX = `import React, { useState, useMemo } from "react";
import { COSMETICS_PRODUCTS } from "../data/products";
import { Product, CartItem, SkinType, ProductCategory } from "../types/cosmetics";

export const CosmeticsStore: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("all");
  const [selectedSkinType, setSelectedSkinType] = useState<SkinType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high" | "rating">("featured");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponFeedback, setCouponFeedback] = useState("");
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // Filter & Sort
  const filteredProducts = useMemo(() => {
    return COSMETICS_PRODUCTS.filter((prod) => {
      const matchCategory = selectedCategory === "all" || prod.category === selectedCategory;
      const matchSkinType = selectedSkinType === "all" || prod.skinType === "all" || prod.skinType === selectedSkinType;
      const matchSearch =
        !searchQuery.trim() ||
        prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prod.keyIngredients.some((ing) => ing.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSkinType && matchSearch;
    }).sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0;
    });
  }, [selectedCategory, selectedSkinType, searchQuery, sortBy]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
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

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return (subtotal * discountPercent) / 100;
  }, [subtotal, discountPercent]);

  const shipping = subtotal > 75 || subtotal === 0 ? 0 : 7.99;
  const grandTotal = Math.max(0, subtotal - discountAmount + shipping);

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === "GLOW20") {
      setDiscountPercent(20);
      setCouponFeedback("Coupon GLOW20 applied: 20% discount saved!");
    } else {
      setCouponFeedback("Invalid promo code. Try GLOW20 for 20% off.");
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2b28] font-sans antialiased">
      {/* Top Banner */}
      <div className="bg-[#1f302b] text-[#f4efe6] px-4 py-2 text-xs md:text-sm font-medium text-center tracking-wide flex justify-center items-center gap-3">
        <span>✨ Welcome to AuraBeauty: Complimentary Express Delivery over $75</span>
        <span className="hidden sm:inline bg-[#334e45] px-2 py-0.5 rounded text-[11px] font-mono">Use Code: GLOW20 for 20% off</span>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-[#faf8f5]/95 backdrop-blur-md border-b border-[#e8dfd2] px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#1f302b] text-[#e8dfd2] flex items-center justify-center font-serif text-lg font-bold">A</span>
              <div>
                <h1 className="font-serif text-2xl font-bold tracking-tight text-[#1f302b]">AuraBeauty</h1>
                <p className="text-[10px] text-[#6b675e] tracking-widest uppercase">Botanical & Clinical Formulations</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="md:hidden relative p-2 text-[#1f302b] hover:bg-[#ebd5] rounded-full"
            >
              🛍️
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#8c5340] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md relative">
            <input
              type="text"
              placeholder="Search botanical actives, 5-step facial kits, serums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#d6c9b8] rounded-full px-4 py-2 text-sm text-[#2c2b28] placeholder-[#999285] focus:outline-none focus:border-[#1f302b] shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-[#8c8577] hover:text-[#1f302b]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Cart Trigger */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 bg-[#1f302b] text-[#f4efe6] px-5 py-2.5 rounded-full hover:bg-[#2c443d] transition-colors shadow-sm font-medium text-sm"
            >
              <span>Shopping Bag</span>
              <span className="bg-[#ebd5] text-[#1f302b] px-2 py-0.5 rounded-full text-xs font-bold">
                {cart.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            </button>
          </div>
        </div>

        {/* Skin Type Routine Selector */}
        <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-[#e8dfd2] flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="font-semibold text-[#6b675e] uppercase tracking-wider text-[11px] whitespace-nowrap mr-2">Skin Profile:</span>
          {(
            [
              { id: "all", label: "All Skin Types" },
              { id: "sensitive", label: "Sensitive & Barrier Repair" },
              { id: "dry", label: "Dry & Dehydrated" },
              { id: "oily", label: "Oily & Blemish-Prone" },
              { id: "mature", label: "Mature & Pro-Age" },
            ] as const
          ).map((skin) => (
            <button
              key={skin.id}
              onClick={() => setSelectedSkinType(skin.id)}
              className={\`px-3 py-1.5 rounded-full whitespace-nowrap transition-all \${
                selectedSkinType === skin.id
                  ? "bg-[#1f302b] text-white font-medium shadow-sm"
                  : "bg-white border border-[#d6c9b8] text-[#555047] hover:border-[#1f302b]"
              }\`}
            >
              {skin.label}
            </button>
          ))}
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#ebd5]/40 to-[#faf8f5] px-4 lg:px-8 py-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <span className="inline-block bg-[#1f302b]/10 text-[#1f302b] font-medium text-xs px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              Clinically Clean Dermatological Formulations
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1f302b] leading-tight">
              Transformative Rituals for Vibrant, Barrier-Strong Skin.
            </h2>
            <p className="mt-4 text-[#5c564b] leading-relaxed text-sm sm:text-base">
              Explore our laboratory-verified botanical facial kits, multi-molecular hydrators, and targeted corrective serums formulated without parabens, synthetic fragrance, or harsh surfactants.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={() => setSelectedCategory("facial_kits")}
                className="bg-[#1f302b] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#2d463e] shadow-md transition-all"
              >
                Shop 5-Step Facial Kits
              </button>
              <button
                onClick={() => setSelectedCategory("serums")}
                className="bg-white border border-[#c4b5a2] text-[#1f302b] px-6 py-3 rounded-full text-sm font-medium hover:border-[#1f302b] transition-all"
              >
                Explore Active Serums
              </button>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-xl border border-[#e0d6c8] aspect-[4/3]">
            <img
              src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=900&auto=format&fit=crop&q=80"
              alt="AuraBeauty Hero Formulation"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
              <div className="text-white">
                <span className="bg-[#8c5340] text-xs font-bold px-2.5 py-1 rounded uppercase">Featured Collection</span>
                <p className="font-serif text-lg font-semibold mt-1">Radiance Revival Facial Therapy</p>
                <p className="text-xs text-white/80">Salon-grade radiance and barrier support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        {/* Category Filter & Sorting Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto">
            {(
              [
                { id: "all", label: "All Formulations" },
                { id: "facial_kits", label: "Facial Kits" },
                { id: "serums", label: "Serums" },
                { id: "cleansers", label: "Cleansers" },
                { id: "masks", label: "Masks" },
                { id: "lip_eye", label: "Lip & Eye" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={\`px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-all \${
                  selectedCategory === cat.id
                    ? "bg-[#8c5340] text-white shadow-sm"
                    : "bg-white border border-[#d6c9b8] text-[#555047] hover:border-[#8c5340]"
                }\`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs self-end md:self-auto">
            <span className="text-[#736c5f]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-[#d6c9b8] rounded-md px-3 py-1.5 text-xs text-[#2c2b28] focus:outline-none focus:border-[#1f302b]"
            >
              <option value="featured">Featured</option>
              <option value="rating">Highest Rated</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border border-[#e2d8ca] overflow-hidden hover:shadow-lg transition-all flex flex-col group"
            >
              <div className="relative aspect-square overflow-hidden bg-[#f0e9df]">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {product.tag && (
                  <span className="absolute top-3 left-3 bg-[#1f302b] text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                    {product.tag}
                  </span>
                )}
                <button
                  onClick={() => setQuickViewProduct(product)}
                  className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-[#1f302b] text-xs font-semibold px-3 py-1.5 rounded-full shadow-md backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Quick View
                </button>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-[#787164] mb-1">
                    <span className="uppercase tracking-wider font-semibold text-[10px] text-[#8c5340]">
                      {product.category.replace("_", " ")}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-[#2c2b28]">
                      ★ {product.rating} ({product.reviewsCount})
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-base text-[#1f302b] group-hover:text-[#8c5340] transition-colors leading-snug">
                    {product.name}
                  </h3>

                  <p className="text-xs text-[#635c50] mt-2 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {product.keyIngredients.slice(0, 3).map((ing, i) => (
                      <span key={i} className="text-[10px] bg-[#f4eee4] text-[#4d473d] px-2 py-0.5 rounded">
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-[#f0e8dc] flex items-center justify-between">
                  <span className="font-serif text-lg font-bold text-[#1f302b]">\${product.price.toFixed(2)}</span>
                  <button
                    onClick={() => addToCart(product)}
                    className="bg-[#1f302b] text-white hover:bg-[#8c5340] text-xs font-semibold px-4 py-2 rounded-full transition-colors shadow-sm"
                  >
                    Add to Bag
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Slide-over Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
            <div className="p-6 border-b border-[#e8dfd2] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#1f302b]">Your Shopping Bag</h3>
                <p className="text-xs text-[#787164] mt-0.5">
                  {cart.reduce((a, b) => a + b.quantity, 0)} items in your formulation routine
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-black text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-[#787164]">
                  <div className="text-4xl mb-3">🌿</div>
                  <p className="font-serif text-base font-semibold text-[#1f302b]">Your bag is empty</p>
                  <p className="text-xs mt-1">Discover botanical skincare solutions for your skin profile.</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="mt-4 bg-[#1f302b] text-white text-xs px-5 py-2.5 rounded-full font-medium"
                  >
                    Explore Catalog
                  </button>
                </div>
              ) : (
                <>
                  {/* Free shipping progress */}
                  <div className="bg-[#f7f3ee] p-3 rounded-lg text-xs">
                    {subtotal >= 75 ? (
                      <p className="text-[#1f302b] font-semibold">🎉 You unlocked Free Express Delivery!</p>
                    ) : (
                      <div>
                        <p className="text-[#555047]">
                          Add <span className="font-bold text-[#1f302b]">\${(75 - subtotal).toFixed(2)}</span> more to unlock Free Express Delivery
                        </p>
                        <div className="w-full bg-[#e0d6c8] h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="bg-[#1f302b] h-full rounded-full transition-all"
                            style={{ width: \`\${Math.min(100, (subtotal / 75) * 100)}%\` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {cart.map((item) => (
                    <div key={item.product.id} className="flex gap-4 border-b border-[#f0e8dc] pb-4">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg bg-[#f0e9df]"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-serif font-bold text-[#1f302b] leading-tight max-w-[200px]">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-gray-400 hover:text-red-600 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <p className="text-xs font-semibold text-[#1f302b] mt-1">\${item.product.price.toFixed(2)}</p>

                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center border border-[#d6c9b8] rounded-md text-xs">
                            <button
                              onClick={() => updateQuantity(item.product.id, -1)}
                              className="px-2 py-0.5 hover:bg-[#f0e8dc]"
                            >
                              -
                            </button>
                            <span className="px-2 font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, 1)}
                              className="px-2 py-0.5 hover:bg-[#f0e8dc]"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-xs text-[#8c8577]">
                            Subtotal: \${(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Promo Voucher */}
                  <div className="pt-2">
                    <label className="text-[11px] font-semibold text-[#6b675e] uppercase">Promo Code</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="e.g. GLOW20"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-white border border-[#d6c9b8] rounded-md px-3 py-1.5 text-xs uppercase text-[#2c2b28] focus:outline-none"
                      />
                      <button
                        onClick={applyCoupon}
                        className="bg-[#334e45] text-white text-xs px-3 py-1.5 rounded-md font-semibold hover:bg-[#1f302b]"
                      >
                        Apply
                      </button>
                    </div>
                    {couponFeedback && (
                      <p className="text-[11px] text-[#1f302b] mt-1 font-medium">{couponFeedback}</p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="p-6 bg-[#faf8f5] border-t border-[#e8dfd2] space-y-3">
                <div className="space-y-1.5 text-xs text-[#555047]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>\${subtotal.toFixed(2)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-[#8c5340] font-medium">
                      <span>Promo Discount ({discountPercent}%)</span>
                      <span>-\${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Express Delivery</span>
                    <span>{shipping === 0 ? "FREE" : \`\$\${shipping.toFixed(2)}\`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-serif font-bold text-[#1f302b] pt-2 border-t border-[#e8dfd2]">
                    <span>Grand Total</span>
                    <span>\${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setCheckoutModalOpen(true);
                  }}
                  className="w-full bg-[#1f302b] hover:bg-[#2c443d] text-white py-3 rounded-full text-sm font-semibold tracking-wide shadow-md transition-all flex justify-center items-center gap-2"
                >
                  <span>Proceed to Secure Checkout</span>
                  <span>🔒</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-[#e8dfd2] relative flex flex-col md:flex-row">
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-sm shadow"
            >
              ✕
            </button>
            <div className="md:w-1/2 aspect-square md:aspect-auto bg-[#f4efe6]">
              <img
                src={quickViewProduct.image}
                alt={quickViewProduct.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="md:w-1/2 p-6 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#8c5340]">
                  {quickViewProduct.category.replace("_", " ")}
                </span>
                <h3 className="font-serif text-xl font-bold text-[#1f302b] mt-1 leading-snug">
                  {quickViewProduct.name}
                </h3>
                <p className="font-serif text-lg font-bold text-[#1f302b] mt-2">
                  \${quickViewProduct.price.toFixed(2)}
                </p>
                <p className="text-xs text-[#555047] mt-3 leading-relaxed">
                  {quickViewProduct.description}
                </p>

                <div className="mt-4 pt-3 border-t border-[#f0e8dc] text-xs">
                  <h5 className="font-semibold text-[#1f302b] mb-1">Clinical Benefits</h5>
                  <p className="text-[#635c50]">{quickViewProduct.clinicalBenefits}</p>

                  <h5 className="font-semibold text-[#1f302b] mt-2 mb-1">Directions</h5>
                  <p className="text-[#635c50]">{quickViewProduct.directions}</p>
                </div>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => {
                    addToCart(quickViewProduct);
                    setQuickViewProduct(null);
                  }}
                  className="w-full bg-[#1f302b] text-white py-2.5 rounded-full text-xs font-semibold hover:bg-[#8c5340] transition-colors shadow"
                >
                  Add to Routine Bag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e8dfd2]">
            {!orderComplete ? (
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-[#e8dfd2]">
                  <h3 className="font-serif text-lg font-bold text-[#1f302b]">Complete Your Order</h3>
                  <button
                    onClick={() => setCheckoutModalOpen(false)}
                    className="text-gray-400 hover:text-black text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="block text-[#6b675e] font-semibold mb-1">Shipping Details</label>
                    <input
                      type="text"
                      defaultValue="Elena Vance"
                      className="w-full border border-[#d6c9b8] rounded px-3 py-2"
                      placeholder="Full Name"
                    />
                    <input
                      type="text"
                      defaultValue="742 Evergreen Terrace, Portland, OR"
                      className="w-full border border-[#d6c9b8] rounded px-3 py-2 mt-2"
                      placeholder="Street Address"
                    />
                  </div>

                  <div>
                    <label className="block text-[#6b675e] font-semibold mb-1">Payment Method</label>
                    <div className="border border-[#1f302b] bg-[#fbf9f6] p-3 rounded flex items-center justify-between">
                      <span className="font-mono">•••• •••• •••• 4242</span>
                      <span className="text-[10px] bg-[#1f302b] text-white px-2 py-0.5 rounded">256-bit SSL</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#e8dfd2] flex justify-between font-serif font-bold text-sm text-[#1f302b]">
                    <span>Total Charged:</span>
                    <span>\${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setOrderComplete(true)}
                  className="w-full mt-5 bg-[#1f302b] text-white py-3 rounded-full text-xs font-bold tracking-wider uppercase hover:bg-[#8c5340] transition-colors shadow"
                >
                  Authorize Payment & Dispatch Order
                </button>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🌿</div>
                <h3 className="font-serif text-2xl font-bold text-[#1f302b]">Order Confirmed!</h3>
                <p className="text-xs text-[#635c50] mt-2">
                  Order #AUR-{Math.floor(100000 + Math.random() * 900000)} has been sent to our clinical formulation lab.
                </p>

                <div className="mt-6 bg-[#faf7f2] p-4 rounded-xl text-left border border-[#e8dfd2] text-xs space-y-2">
                  <div className="flex items-center gap-2 text-[#1f302b] font-medium">
                    <span>✓</span> <span>Order Authenticated & Card Approved</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#1f302b] font-medium">
                    <span>✓</span> <span>Clean Room Formulation & Batch Inspection</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#787164]">
                    <span>⏳</span> <span>Carrier Handoff & Temperature-Controlled Transit</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCheckoutModalOpen(false);
                    setOrderComplete(false);
                    setCart([]);
                  }}
                  className="mt-6 bg-[#1f302b] text-white px-6 py-2.5 rounded-full text-xs font-semibold"
                >
                  Return to Storefront
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
`;
