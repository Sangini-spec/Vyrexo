import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  generateEmptySessionHtml,
  generateInvestmentAdvisorHtml,
  generateRoomCanvasHtml,
  generateGenericAppHtml,
  generateCosmeticsEcommerceHtml,
  generateCalculatorHtml,
} from "./templates";
import { updateSessionProjectType, getSessionProject } from "@/lib/project-session-store";
import { generateLiveAppHtml, getWorkspaceAppCode } from "./live-runner";
import { getWorkspaceDir } from "@/lib/workspace-executor";

// In-memory preview store keyed by session ID to guarantee strict session isolation
const globalPreviewStore = globalThis as unknown as {
  __sessionPreviews?: Map<string, string>;
};
if (!globalPreviewStore.__sessionPreviews) {
  globalPreviewStore.__sessionPreviews = new Map<string, string>();
}
const sessionPreviews = globalPreviewStore.__sessionPreviews;

// E-Commerce template for shopping-related builds
const defaultEcommerceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AuraMart — Modern E-Commerce Suite</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .fade-in { animation: fadeIn 0.25s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    .prime-badge { background: linear-gradient(90deg, #00A8E8 0%, #007EA7 100%); }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  </style>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen flex flex-col antialiased">

  <!-- TOP AMAZON-STYLE NAVBAR -->
  <header class="sticky top-0 z-50 bg-slate-950 border-b border-slate-800 shadow-md">
    <!-- Main Bar -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
      <!-- Brand Logo -->
      <div class="flex items-center gap-3 cursor-pointer" onclick="navigateTo('landing')">
        <div class="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20">
          <i class="fa-solid fa-bag-shopping"></i>
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="text-lg font-extrabold tracking-tight text-white">Aura<span class="text-amber-400">Mart</span></span>
            <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Prime</span>
          </div>
          <p class="text-[10px] text-slate-400 -mt-0.5">Clothes & Household Store</p>
        </div>
      </div>

      <!-- Search Bar -->
      <div class="flex-1 max-w-2xl hidden md:flex items-center">
        <div class="relative w-full flex">
          <select id="search-category" class="bg-slate-800 text-xs text-slate-300 px-3 py-2 rounded-l-lg border-y border-l border-slate-700 focus:outline-none cursor-pointer">
            <option value="all">All Departments</option>
            <option value="clothing">Clothes & Fashion</option>
            <option value="household">Household & Home</option>
          </select>
          <input
            id="nav-search-input"
            type="text"
            placeholder="Search clothes, linen, kitchenware, furniture..."
            class="flex-1 bg-slate-900 border-y border-slate-700 px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            oninput="handleSearch(this.value)"
          />
          <button
            onclick="triggerSearch()"
            class="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-r-lg font-bold text-xs transition-colors"
          >
            <i class="fa-solid fa-magnifying-glass"></i>
          </button>
        </div>
      </div>

      <!-- Right Nav Actions -->
      <div class="flex items-center gap-2 sm:gap-4">
        <!-- Navigation Buttons -->
        <button onclick="navigateTo('landing')" id="nav-btn-landing" class="px-2.5 py-1.5 text-xs font-medium text-amber-400 hover:text-white transition-colors">
          Home
        </button>
        <button onclick="navigateTo('items')" id="nav-btn-items" class="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors">
          Shop Items
        </button>
        <button onclick="navigateTo('orders')" id="nav-btn-orders" class="px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1">
          <span>Orders</span>
          <span id="order-count-badge" class="px-1.5 py-0.2 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">1</span>
        </button>

        <!-- Cart Trigger -->
        <button onclick="toggleCartModal(true)" class="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg transition-all text-xs font-medium text-white shadow-sm">
          <div class="relative">
            <i class="fa-solid fa-cart-shopping text-amber-400 text-sm"></i>
            <span id="cart-badge" class="absolute -top-2 -right-2 bg-amber-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow">
              0
            </span>
          </div>
          <span class="hidden sm:inline font-semibold" id="cart-nav-total">$0.00</span>
        </button>
      </div>
    </div>

    <!-- Sub-Navbar Categories Strip -->
    <div class="bg-slate-900/90 border-t border-slate-800/80 px-4 sm:px-6 py-1.5">
      <div class="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-400 overflow-x-auto hide-scrollbar gap-4">
        <div class="flex items-center gap-4 shrink-0">
          <button onclick="filterByNav('all')" class="hover:text-amber-400 flex items-center gap-1 font-medium text-slate-200">
            <i class="fa-solid fa-bars text-xs"></i> All Categories
          </button>
          <button onclick="filterByNav('clothing')" class="hover:text-amber-400 transition-colors">Men's & Women's Clothing</button>
          <button onclick="filterByNav('household')" class="hover:text-amber-400 transition-colors">Household & Essentials</button>
          <button onclick="filterByNav('deals')" class="hover:text-amber-400 text-amber-400 font-medium transition-colors">🔥 Today's Mega Deals</button>
          <button onclick="filterByNav('bestsellers')" class="hover:text-amber-400 transition-colors">Best Sellers</button>
        </div>
        <div class="shrink-0 flex items-center gap-2 text-[11px] text-slate-400 hidden sm:flex">
          <i class="fa-solid fa-truck-fast text-amber-400"></i> Free Next-Day Prime Delivery on orders over $35
        </div>
      </div>
    </div>
  </header>

  <!-- MAIN CONTAINER -->
  <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- ==================== VIEW 1: LANDING PAGE ==================== -->
    <section id="view-landing" class="space-y-6 fade-in">
      <!-- Hero Banner -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-slate-800 p-8 sm:p-10 shadow-xl">
        <div class="relative z-10 max-w-xl space-y-3">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <i class="fa-solid fa-tag"></i> Big Summer Refresh Event
          </span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Premium Apparel & Household Essentials.
          </h2>
          <p class="text-sm text-slate-300 leading-relaxed">
            Curated modern wardrobe pieces and elevated home goods designed for comfort, longevity, and everyday living.
          </p>
          <div class="pt-2 flex flex-wrap items-center gap-3">
            <button onclick="navigateTo('items')" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2">
              <span>Explore All Products</span>
              <i class="fa-solid fa-arrow-right"></i>
            </button>
            <button onclick="filterByNav('deals')" class="bg-slate-800/80 hover:bg-slate-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs border border-slate-700 transition-all">
              View 40% Off Deals
            </button>
          </div>
        </div>
        <!-- Abstract Glow Background -->
        <div class="absolute -right-10 -bottom-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute right-20 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      <!-- Category Spotlight Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Card 1 -->
        <div onclick="filterByNav('clothing')" class="bg-slate-950 hover:bg-slate-800/60 border border-slate-800 rounded-xl p-5 cursor-pointer transition-all hover:border-slate-700 group space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Apparel & Fashion</h3>
            <span class="text-xs text-amber-400 group-hover:translate-x-1 transition-transform"><i class="fa-solid fa-arrow-right"></i></span>
          </div>
          <div class="h-32 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center text-4xl text-indigo-400">
            <i class="fa-solid fa-shirt"></i>
          </div>
          <p class="text-xs text-slate-400">Jackets, organic tees, denim & knitwear for every season.</p>
        </div>

        <!-- Card 2 -->
        <div onclick="filterByNav('household')" class="bg-slate-950 hover:bg-slate-800/60 border border-slate-800 rounded-xl p-5 cursor-pointer transition-all hover:border-slate-700 group space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Home & Household</h3>
            <span class="text-xs text-amber-400 group-hover:translate-x-1 transition-transform"><i class="fa-solid fa-arrow-right"></i></span>
          </div>
          <div class="h-32 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center text-4xl text-emerald-400">
            <i class="fa-solid fa-couch"></i>
          </div>
          <p class="text-xs text-slate-400">Kitchen essentials, Egyptian cotton bedding & minimalist decor.</p>
        </div>

        <!-- Card 3 -->
        <div onclick="filterByNav('deals')" class="bg-slate-950 hover:bg-slate-800/60 border border-slate-800 rounded-xl p-5 cursor-pointer transition-all hover:border-slate-700 group space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Lightning Deals</h3>
            <span class="text-xs text-amber-400 group-hover:translate-x-1 transition-transform"><i class="fa-solid fa-arrow-right"></i></span>
          </div>
          <div class="h-32 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center text-4xl text-rose-400">
            <i class="fa-solid fa-bolt"></i>
          </div>
          <p class="text-xs text-slate-400">Save up to 40% on top trending everyday items today.</p>
        </div>

        <!-- Card 4 -->
        <div onclick="navigateTo('orders')" class="bg-slate-950 hover:bg-slate-800/60 border border-slate-800 rounded-xl p-5 cursor-pointer transition-all hover:border-slate-700 group space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-white">Your Orders & Returns</h3>
            <span class="text-xs text-amber-400 group-hover:translate-x-1 transition-transform"><i class="fa-solid fa-arrow-right"></i></span>
          </div>
          <div class="h-32 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-center text-4xl text-amber-400">
            <i class="fa-solid fa-box-open"></i>
          </div>
          <p class="text-xs text-slate-400">Track shipments, download invoices, and manage reorders.</p>
        </div>
      </div>

      <!-- Featured Items Carousel Grid -->
      <div class="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-base font-bold text-white">Trending Picks for You</h3>
            <p class="text-xs text-slate-400">Top-rated apparel and household goods with Prime 1-day delivery</p>
          </div>
          <button onclick="navigateTo('items')" class="text-xs font-semibold text-amber-400 hover:text-amber-300">
            See all items &rarr;
          </button>
        </div>
        <div id="landing-featured-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Populated via JS -->
        </div>
      </div>
    </section>

    <!-- ==================== VIEW 2: ITEMS / CATALOG PAGE ==================== -->
    <section id="view-items" class="space-y-6 hidden fade-in">
      <div class="flex flex-col md:flex-row gap-6">
        
        <!-- Sidebar Filters -->
        <aside class="w-full md:w-64 space-y-5 bg-slate-950 border border-slate-800 rounded-xl p-4 shrink-0 h-fit">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-200">Department & Filters</h3>
            <button onclick="resetFilters()" class="text-[11px] text-amber-400 hover:underline">Reset</button>
          </div>

          <!-- Category Filter -->
          <div class="space-y-2">
            <h4 class="text-xs font-semibold text-slate-300">Category</h4>
            <div class="space-y-1 text-xs">
              <label class="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer">
                <input type="radio" name="cat-filter" value="all" checked onchange="applyFilters()" class="text-amber-500 focus:ring-0">
                All Departments
              </label>
              <label class="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer">
                <input type="radio" name="cat-filter" value="clothing" onchange="applyFilters()" class="text-amber-500 focus:ring-0">
                Clothes & Apparel
              </label>
              <label class="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer">
                <input type="radio" name="cat-filter" value="household" onchange="applyFilters()" class="text-amber-500 focus:ring-0">
                Household & Kitchen
              </label>
            </div>
          </div>

          <!-- Price Filter -->
          <div class="space-y-2">
            <div class="flex justify-between items-center text-xs">
              <h4 class="font-semibold text-slate-300">Max Price</h4>
              <span id="price-val" class="font-mono text-amber-400 font-bold">$250</span>
            </div>
            <input
              id="price-range"
              type="range"
              min="20"
              max="300"
              value="250"
              step="10"
              class="w-full accent-amber-500 cursor-pointer"
              oninput="document.getElementById('price-val').innerText = '$' + this.value; applyFilters();"
            />
          </div>

          <!-- Prime Delivery Only -->
          <div class="pt-2 border-t border-slate-800 space-y-2">
            <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" id="prime-only" onchange="applyFilters()" class="rounded text-amber-500 focus:ring-0">
              <span class="inline-flex items-center gap-1 font-semibold text-white">
                <span class="text-amber-400 font-bold">Prime</span> Next-Day Only
              </span>
            </label>
          </div>
        </aside>

        <!-- Product Listing Grid Area -->
        <div class="flex-1 space-y-4">
          <!-- Filter stats bar -->
          <div class="flex items-center justify-between bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
            <div class="text-slate-400">
              Showing <span id="results-count" class="font-bold text-white">0</span> items
            </div>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">Sort by:</span>
              <select id="sort-select" onchange="applyFilters()" class="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none">
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Customer Rating</option>
              </select>
            </div>
          </div>

          <!-- Products Grid -->
          <div id="catalog-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Populated via JS -->
          </div>
        </div>

      </div>
    </section>

    <!-- ==================== VIEW 3: ORDERS & TRACKING PAGE ==================== -->
    <section id="view-orders" class="space-y-6 hidden fade-in">
      <div class="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 class="text-xl font-bold text-white">Your Orders & Shipments</h2>
            <p class="text-xs text-slate-400">Real-time parcel tracking and order history</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
              <i class="fa-solid fa-check-circle mr-1"></i> Live Order Synced
            </span>
          </div>
        </div>

        <!-- Orders List Container -->
        <div id="orders-list" class="space-y-4">
          <!-- Populated via JS -->
        </div>
      </div>
    </section>

  </main>

  <!-- ==================== CART DRAWER / MODAL ==================== -->
  <div id="cart-drawer" class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm hidden flex justify-end">
    <div class="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col p-6 shadow-2xl space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-cart-shopping text-amber-400"></i>
          <h3 class="font-bold text-base text-white">Shopping Cart</h3>
          <span id="cart-drawer-count" class="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">0</span>
        </div>
        <button onclick="toggleCartModal(false)" class="text-slate-400 hover:text-white p-1">
          <i class="fa-solid fa-xmark text-lg"></i>
        </button>
      </div>

      <!-- Items Scroll -->
      <div id="cart-items-container" class="flex-1 overflow-y-auto space-y-3 pr-1">
        <!-- Rendered via JS -->
      </div>

      <!-- Summary & Checkout Footer -->
      <div class="border-t border-slate-800 pt-4 space-y-3 bg-slate-950">
        <div class="space-y-1.5 text-xs text-slate-400">
          <div class="flex justify-between">
            <span>Subtotal</span>
            <span id="cart-subtotal" class="text-white font-mono">$0.00</span>
          </div>
          <div class="flex justify-between">
            <span>Prime Shipping</span>
            <span class="text-emerald-400 font-semibold">FREE</span>
          </div>
          <div class="flex justify-between">
            <span>Estimated Tax (8%)</span>
            <span id="cart-tax" class="text-white font-mono">$0.00</span>
          </div>
          <div class="flex justify-between text-sm font-bold text-white border-t border-slate-800/80 pt-2">
            <span>Total to Pay</span>
            <span id="cart-total" class="text-amber-400 font-mono text-base">$0.00</span>
          </div>
        </div>

        <button
          onclick="proceedToCheckout()"
          id="checkout-btn"
          class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          <i class="fa-solid fa-lock"></i>
          <span>Proceed to 1-Click Checkout</span>
        </button>
      </div>
    </div>
  </div>

  <!-- ==================== PRODUCT QUICK VIEW MODAL ==================== -->
  <div id="product-modal" class="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm hidden flex items-center justify-center p-4">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative">
      <button onclick="closeProductModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white p-1">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="product-modal-content">
        <!-- Rendered via JS -->
      </div>
    </div>
  </div>

  <!-- JAVASCRIPT APP STATE & ENGINE -->
  <script>
    // Sample Products Data Store (Clothes & Household)
    const PRODUCTS = [
      // CLOTHING
      {
        id: 101,
        name: "Merino Wool Thermal Knit Hoodie",
        category: "clothing",
        price: 78.50,
        rating: 4.8,
        reviewsCount: 342,
        icon: "fa-solid fa-shirt",
        colorBg: "bg-indigo-900/40 text-indigo-400",
        badge: "Best Seller",
        isPrime: true,
        description: "100% fine Italian merino wool knit sweater with breathable temperature-regulating fibers. Tailored modern fit with double-stitched ribbed cuffs."
      },
      {
        id: 102,
        name: "Waterproof Expedition Trench Jacket",
        category: "clothing",
        price: 135.00,
        rating: 4.9,
        reviewsCount: 512,
        icon: "fa-solid fa-vest",
        colorBg: "bg-sky-900/40 text-sky-400",
        badge: "Editor's Choice",
        isPrime: true,
        description: "Triple-layer Gore-weave storm shell with taped seams, windproof hood, and magnetic pocket clasps. Tested down to -10°C."
      },
      {
        id: 103,
        name: "Organic Cotton Relaxed Chino Trousers",
        category: "clothing",
        price: 49.99,
        rating: 4.6,
        reviewsCount: 188,
        icon: "fa-solid fa-socks",
        colorBg: "bg-amber-900/40 text-amber-400",
        badge: null,
        isPrime: true,
        description: "Soft washed Japanese organic cotton with 2% elastane stretch. Wrinkle-resistant finish perfect for office or casual weekends."
      },
      {
        id: 104,
        name: "Supima Cotton Heavyweight Crew Tee (3-Pack)",
        category: "clothing",
        price: 38.00,
        rating: 4.7,
        reviewsCount: 890,
        icon: "fa-solid fa-shirt",
        colorBg: "bg-slate-800 text-slate-300",
        badge: "Deal 25% Off",
        isPrime: true,
        description: "220 GSM combed heavyweight Supima cotton. Retains neck shape through 100+ wash cycles without fading or shrinking."
      },
      // HOUSEHOLD
      {
        id: 201,
        name: "Cast Iron 5.5-Quart Dutch Oven",
        category: "household",
        price: 89.90,
        rating: 4.9,
        reviewsCount: 1240,
        icon: "fa-solid fa-kitchen-set",
        colorBg: "bg-rose-900/40 text-rose-400",
        badge: "Amazon's Choice",
        isPrime: true,
        description: "Heavy enamel-glazed cast iron with superior heat retention and self-basting lid spikes. Oven safe up to 500°F."
      },
      {
        id: 202,
        name: "Egyptian Cotton 800-Thread Sheet Set",
        category: "household",
        price: 64.00,
        rating: 4.8,
        reviewsCount: 650,
        icon: "fa-solid fa-bed",
        colorBg: "bg-teal-900/40 text-teal-400",
        badge: "Best Seller",
        isPrime: true,
        description: "Silky sateen weave long-staple Egyptian cotton. Deep pocket fitted sheet accommodates mattresses up to 18 inches."
      },
      {
        id: 203,
        name: "Minimalist Nordic Ceramic Dinnerware (16-Pc)",
        category: "household",
        price: 94.50,
        rating: 4.7,
        reviewsCount: 230,
        icon: "fa-solid fa-utensils",
        colorBg: "bg-stone-800 text-stone-300",
        badge: null,
        isPrime: true,
        description: "Matte stoneware dinner plates, salad bowls, and mugs. Microwave and dishwasher safe with scratch-proof glazes."
      },
      {
        id: 204,
        name: "Smart Ultrasonic Essential Oil Diffuser",
        category: "household",
        price: 32.99,
        rating: 4.6,
        reviewsCount: 420,
        icon: "fa-solid fa-spray-can-sparkles",
        colorBg: "bg-emerald-900/40 text-emerald-400",
        badge: "Deal 30% Off",
        isPrime: true,
        description: "500ml capacity with 14 ambient LED light modes, Whisper-quiet 20dB operation, auto shut-off, and Alexa voice integration."
      }
    ];

    // State
    let cart = [
      { product: PRODUCTS[0], quantity: 1 },
      { product: PRODUCTS[4], quantity: 1 }
    ];

    let orders = [
      {
        id: "AMZ-9824-3012",
        date: "August 24, 2026",
        items: [
          { name: "Merino Wool Thermal Knit Hoodie", qty: 1, price: 78.50 },
          { name: "Cast Iron 5.5-Quart Dutch Oven", qty: 1, price: 89.90 }
        ],
        total: 181.87,
        status: "Out for Delivery",
        statusStep: 3, // 1: Placed, 2: Packed, 3: Out for Delivery, 4: Delivered
        carrier: "Prime Express (Track #PE883901)"
      }
    ];

    let currentView = "landing";
    let searchQuery = "";
    let selectedCat = "all";

    function navigateTo(view) {
      currentView = view;
      ['landing', 'items', 'orders'].forEach(v => {
        const el = document.getElementById(\`view-\${v}\`);
        const btn = document.getElementById(\`nav-btn-\${v}\`);
        if (v === view) {
          el.classList.remove('hidden');
          btn.className = "px-2.5 py-1.5 text-xs font-semibold text-amber-400 transition-colors";
        } else {
          el.classList.add('hidden');
          btn.className = "px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors";
        }
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderFeaturedLanding() {
      const container = document.getElementById('landing-featured-grid');
      container.innerHTML = "";
      PRODUCTS.slice(0, 4).forEach(p => {
        const card = createProductCardHtml(p);
        container.appendChild(card);
      });
    }

    function createProductCardHtml(p) {
      const div = document.createElement('div');
      div.className = "bg-slate-900 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all group space-y-3";
      
      const badgeHtml = p.badge ? \`<span class="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">\${p.badge}</span>\` : '<span></span>';
      
      div.innerHTML = \`
        <div>
          <div class="flex items-center justify-between">
            \${badgeHtml}
            <span class="text-[10px] text-slate-400 uppercase tracking-widest">\${p.category}</span>
          </div>
          <div class="h-36 my-3 rounded-lg \${p.colorBg} flex items-center justify-center text-4xl shadow-inner cursor-pointer" onclick="openProductModal(\${p.id})">
            <i class="\${p.icon} group-hover:scale-110 transition-transform"></i>
          </div>
          <h4 class="font-bold text-xs text-white line-clamp-1 hover:text-amber-400 cursor-pointer" onclick="openProductModal(\${p.id})">\${p.name}</h4>
          <div class="flex items-center gap-1 mt-1 text-xs text-amber-400">
            <i class="fa-solid fa-star text-[10px]"></i>
            <span class="font-semibold">\${p.rating}</span>
            <span class="text-slate-500 text-[10px]">(\${p.reviewsCount})</span>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <div class="text-sm font-extrabold text-white font-mono">$\${p.price.toFixed(2)}</div>
            <div class="text-[10px] text-cyan-400 font-semibold"><i class="fa-solid fa-bolt text-[9px]"></i> Prime 1-Day</div>
          </div>
          <button
            onclick="addToCart(\${p.id})"
            class="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1"
          >
            <i class="fa-solid fa-plus text-[10px]"></i> Add
          </button>
        </div>
      \`;
      return div;
    }

    function applyFilters() {
      const catVal = document.querySelector('input[name="cat-filter"]:checked')?.value || 'all';
      const maxPrice = parseFloat(document.getElementById('price-range').value);
      const primeOnly = document.getElementById('prime-only').checked;

      let filtered = PRODUCTS.filter(p => {
        if (catVal !== 'all' && p.category !== catVal) return false;
        if (p.price > maxPrice) return false;
        if (primeOnly && !p.isPrime) return false;
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.description.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        return true;
      });

      const sortVal = document.getElementById('sort-select').value;
      if (sortVal === 'price-low') filtered.sort((a, b) => a.price - b.price);
      else if (sortVal === 'price-high') filtered.sort((a, b) => b.price - a.price);
      else if (sortVal === 'rating') filtered.sort((a, b) => b.rating - a.rating);

      const grid = document.getElementById('catalog-grid');
      grid.innerHTML = "";
      document.getElementById('results-count').innerText = filtered.length;

      if (filtered.length === 0) {
        grid.innerHTML = \`<div class="col-span-full py-12 text-center text-slate-400 text-xs">No products match the selected criteria.</div>\`;
        return;
      }

      filtered.forEach(p => {
        grid.appendChild(createProductCardHtml(p));
      });
    }

    function filterByNav(type) {
      navigateTo('items');
      if (type === 'clothing' || type === 'household') {
        const rad = document.querySelector(\`input[name="cat-filter"][value="\${type}"]\`);
        if (rad) rad.checked = true;
      } else {
        const rad = document.querySelector('input[name="cat-filter"][value="all"]');
        if (rad) rad.checked = true;
      }
      applyFilters();
    }

    function resetFilters() {
      document.querySelector('input[name="cat-filter"][value="all"]').checked = true;
      document.getElementById('price-range').value = 250;
      document.getElementById('price-val').innerText = '$250';
      document.getElementById('prime-only').checked = false;
      document.getElementById('nav-search-input').value = '';
      searchQuery = '';
      applyFilters();
    }

    function handleSearch(val) {
      searchQuery = val;
      if (currentView !== 'items') navigateTo('items');
      applyFilters();
    }

    function triggerSearch() {
      const val = document.getElementById('nav-search-input').value;
      handleSearch(val);
    }

    // CART LOGIC
    function addToCart(productId) {
      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) return;
      const existing = cart.find(item => item.product.id === productId);
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ product, quantity: 1 });
      }
      renderCart();
      toggleCartModal(true);
    }

    function updateCartQty(productId, delta) {
      const item = cart.find(i => i.product.id === productId);
      if (!item) return;
      item.quantity += delta;
      if (item.quantity <= 0) {
        cart = cart.filter(i => i.product.id !== productId);
      }
      renderCart();
    }

    function renderCart() {
      const container = document.getElementById('cart-items-container');
      container.innerHTML = "";

      const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
      const subtotal = cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      document.getElementById('cart-badge').innerText = totalItems;
      document.getElementById('cart-drawer-count').innerText = totalItems;
      document.getElementById('cart-nav-total').innerText = \`$\${subtotal.toFixed(2)}\`;
      document.getElementById('cart-subtotal').innerText = \`$\${subtotal.toFixed(2)}\`;
      document.getElementById('cart-tax').innerText = \`$\${tax.toFixed(2)}\`;
      document.getElementById('cart-total').innerText = \`$\${total.toFixed(2)}\`;

      if (cart.length === 0) {
        container.innerHTML = \`
          <div class="h-64 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
            <i class="fa-solid fa-cart-shopping text-3xl"></i>
            <p class="text-xs">Your shopping cart is currently empty.</p>
            <button onclick="toggleCartModal(false); navigateTo('items');" class="mt-2 text-xs text-amber-400 underline">Continue Shopping</button>
          </div>
        \`;
        document.getElementById('checkout-btn').disabled = true;
        document.getElementById('checkout-btn').classList.add('opacity-50', 'cursor-not-allowed');
        return;
      }

      document.getElementById('checkout-btn').disabled = false;
      document.getElementById('checkout-btn').classList.remove('opacity-50', 'cursor-not-allowed');

      cart.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-xl";
        div.innerHTML = \`
          <div class="w-12 h-12 rounded-lg \${item.product.colorBg} flex items-center justify-center text-lg shrink-0">
            <i class="\${item.product.icon}"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h5 class="text-xs font-semibold text-white truncate">\${item.product.name}</h5>
            <div class="text-xs text-amber-400 font-mono font-bold mt-0.5">$\${item.product.price.toFixed(2)}</div>
          </div>
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button onclick="updateCartQty(\${item.product.id}, -1)" class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white text-xs">-</button>
            <span class="text-xs font-mono font-bold text-white px-1">\${item.quantity}</span>
            <button onclick="updateCartQty(\${item.product.id}, 1)" class="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white text-xs">+</button>
          </div>
        \`;
        container.appendChild(div);
      });
    }

    function toggleCartModal(open) {
      const drawer = document.getElementById('cart-drawer');
      if (open) {
        drawer.classList.remove('hidden');
      } else {
        drawer.classList.add('hidden');
      }
    }

    // CHECKOUT & ORDERS LOGIC
    function proceedToCheckout() {
      if (cart.length === 0) return;

      const subtotal = cart.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
      const tax = subtotal * 0.08;
      const total = subtotal + tax;

      const newOrder = {
        id: "AMZ-" + Math.floor(1000 + Math.random() * 9000) + "-" + Math.floor(1000 + Math.random() * 9000),
        date: "August 24, 2026 (Just now)",
        items: cart.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price })),
        total: total,
        status: "Processing & Packaging",
        statusStep: 2,
        carrier: "Prime Express 1-Day (Track #PE" + Math.floor(100000 + Math.random() * 900000) + ")"
      };

      orders.unshift(newOrder);
      cart = [];
      renderCart();
      toggleCartModal(false);
      renderOrders();
      navigateTo('orders');
    }

    function renderOrders() {
      const container = document.getElementById('orders-list');
      container.innerHTML = "";
      document.getElementById('order-count-badge').innerText = orders.length;

      orders.forEach(ord => {
        const div = document.createElement('div');
        div.className = "bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4";
        
        const itemsListHtml = ord.items.map(it => \`
          <div class="flex justify-between text-xs text-slate-300">
            <span>\${it.qty}x \${it.name}</span>
            <span class="font-mono text-white">$\${(it.price * it.qty).toFixed(2)}</span>
          </div>
        \`).join('');

        div.innerHTML = \`
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
            <div>
              <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order \${ord.id}</span>
              <div class="text-xs text-slate-300 font-medium">Placed on \${ord.date}</div>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-400">Total Paid:</span>
              <span class="text-sm font-bold text-amber-400 font-mono ml-1">$\${ord.total.toFixed(2)}</span>
            </div>
          </div>

          <!-- Tracking Timeline -->
          <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-slate-300"><i class="fa-solid fa-truck-fast text-amber-400 mr-1.5"></i> Status: <span class="text-emerald-400">\${ord.status}</span></span>
              <span class="text-[11px] text-slate-400 font-mono">\${ord.carrier}</span>
            </div>

            <!-- Progress Bar -->
            <div class="grid grid-cols-4 gap-2 pt-1">
              <div class="text-center">
                <div class="h-1.5 rounded-full bg-emerald-500"></div>
                <span class="text-[9px] text-slate-400 mt-1 block">Ordered</span>
              </div>
              <div class="text-center">
                <div class="h-1.5 rounded-full \${ord.statusStep >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}"></div>
                <span class="text-[9px] text-slate-400 mt-1 block">Packed</span>
              </div>
              <div class="text-center">
                <div class="h-1.5 rounded-full \${ord.statusStep >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}"></div>
                <span class="text-[9px] text-slate-400 mt-1 block">On the Way</span>
              </div>
              <div class="text-center">
                <div class="h-1.5 rounded-full \${ord.statusStep >= 4 ? 'bg-emerald-500' : 'bg-slate-800'}"></div>
                <span class="text-[9px] text-slate-400 mt-1 block">Delivered</span>
              </div>
            </div>
          </div>

          <!-- Items Summary -->
          <div class="space-y-1.5 pt-1">
            <h5 class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ordered Items</h5>
            \${itemsListHtml}
          </div>
        \`;
        container.appendChild(div);
      });
    }

    // PRODUCT QUICK VIEW
    function openProductModal(id) {
      const p = PRODUCTS.find(prod => prod.id === id);
      if (!p) return;

      const modal = document.getElementById('product-modal');
      const content = document.getElementById('product-modal-content');

      content.innerHTML = \`
        <div class="h-64 rounded-xl \${p.colorBg} flex items-center justify-center text-6xl shadow-inner">
          <i class="\${p.icon}"></i>
        </div>
        <div class="space-y-4 flex flex-col justify-between">
          <div class="space-y-2">
            <span class="text-[10px] uppercase font-bold text-amber-400 tracking-wider">\${p.category}</span>
            <h3 class="text-lg font-bold text-white">\${p.name}</h3>
            <div class="flex items-center gap-2 text-xs text-amber-400">
              <i class="fa-solid fa-star"></i>
              <span class="font-bold">\${p.rating}</span>
              <span class="text-slate-500">(\${p.reviewsCount} customer reviews)</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed pt-1">\${p.description}</p>
          </div>

          <div class="space-y-3 pt-4 border-t border-slate-800">
            <div class="flex items-baseline gap-2">
              <span class="text-2xl font-black text-white font-mono">$\${p.price.toFixed(2)}</span>
              <span class="text-xs text-emerald-400 font-semibold">In Stock & Ready to Ship</span>
            </div>
            <button
              onclick="addToCart(\${p.id}); closeProductModal();"
              class="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <i class="fa-solid fa-cart-plus"></i> Add to Cart Now
            </button>
          </div>
        </div>
      \`;

      modal.classList.remove('hidden');
    }

    function closeProductModal() {
      document.getElementById('product-modal').classList.add('hidden');
    }

    // INITIALIZATION
    renderFeaturedLanding();
    applyFilters();
    renderCart();
    renderOrders();
  </script>
</body>
</html>`;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session") || url.searchParams.get("sessionId");
  const template = url.searchParams.get("template");
  const customHtml = url.searchParams.get("html");

  let htmlToServe: string;

  if (customHtml) {
    htmlToServe = customHtml;
  } else if (template === "investment_advisor") {
    htmlToServe = generateInvestmentAdvisorHtml();
  } else if (template === "ecommerce") {
    htmlToServe = defaultEcommerceHtml;
  } else if (template === "room_canvas") {
    htmlToServe = generateRoomCanvasHtml();
  } else if (template === "calculator" || template === "calc") {
    htmlToServe = generateCalculatorHtml();
  } else if (sessionId) {
    // 1. Check if the session has real generated application code on disk or workspace
    const wsApp = getWorkspaceAppCode(sessionId);
    if (wsApp && (wsApp.compiledJs || wsApp.code)) {
      htmlToServe = generateLiveAppHtml(wsApp.code, wsApp.title, wsApp.compiledJs);
    } else if (sessionPreviews.has(sessionId)) {
      htmlToServe = sessionPreviews.get(sessionId)!;
    } else {
      let activeProj = getSessionProject(sessionId);
      if (!activeProj) {
        try {
          const wsDir = getWorkspaceDir(sessionId);
          const metaPath = path.join(wsDir, "project-meta.json");
          if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
            const title = meta.title || "";
            if (/calc|calculator/i.test(title)) {
              activeProj = { type: "calculator", title } as any;
            } else if (/cosmetic|beauty|skincare/i.test(title)) {
              activeProj = { type: "cosmetics_ecommerce", title } as any;
            } else if (/room|canvas|avatar/i.test(title)) {
              activeProj = { type: "room_canvas", title } as any;
            } else if (/invest|wealth|portfolio/i.test(title)) {
              activeProj = { type: "investment_advisor", title } as any;
            } else if (/shop|ecom|store/i.test(title)) {
              activeProj = { type: "ecommerce", title } as any;
            }
          } else if (fs.existsSync(path.join(wsDir, "src", "components", "Calculator.tsx"))) {
            activeProj = { type: "calculator", title: "OmniCalc Pro — Scientific & Financial Calculation Suite" } as any;
          }
        } catch {}
      }

      if (activeProj?.type === "ecommerce") {
        htmlToServe = defaultEcommerceHtml;
      } else if (activeProj?.type === "cosmetics_ecommerce") {
        htmlToServe = generateCosmeticsEcommerceHtml(activeProj.title);
      } else if (activeProj?.type === "investment_advisor") {
        htmlToServe = generateInvestmentAdvisorHtml(activeProj.title);
      } else if (activeProj?.type === "room_canvas") {
        htmlToServe = generateRoomCanvasHtml(activeProj.title);
      } else if (activeProj?.type === "calculator" || /calc|calculator/i.test(activeProj?.title || "")) {
        htmlToServe = generateCalculatorHtml(activeProj?.title);
      } else {
        htmlToServe = generateEmptySessionHtml(sessionId);
      }
    }
  } else if (sessionPreviews.has("default")) {
    htmlToServe = sessionPreviews.get("default")!;
  } else {
    // If no session specified and no default, return an isolated empty sandbox rather than leaking e-commerce
    htmlToServe = generateEmptySessionHtml("default");
  }

  return new NextResponse(htmlToServe, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = body.sessionId || body.session || "default";

    // Guard: conversational questions, clarifications, or complaints must NEVER overwrite an application preview
    if (body.topic && typeof body.topic === "string") {
      const isConversationalOrQuestion =
        /(explain|what is|what are|how does|how do|why|tell me|no i was|can you|describe|\?|features|workspace)/i.test(
          body.topic
        ) || body.topic.length > 60;
      if (isConversationalOrQuestion && sessionPreviews.has(sessionId)) {
        // Retain existing authentic application preview
        const previewUrl = `/api/preview?session=${encodeURIComponent(sessionId)}&t=${Date.now()}`;
        return NextResponse.json({ ok: true, previewUrl, sessionId });
      }
    }

    if (body.html) {
      sessionPreviews.set(sessionId, body.html);
      updateSessionProjectType(sessionId, "custom", body.title || "Custom Application");
    } else if (body.type === "room_canvas" || body.type === "canvas" || body.type === "room") {
      sessionPreviews.set(sessionId, generateRoomCanvasHtml(body.title || "Collaborative Virtual Space"));
      updateSessionProjectType(sessionId, "room_canvas");
    } else if (body.type === "calculator" || body.type === "calc") {
      sessionPreviews.set(sessionId, generateCalculatorHtml(body.title || "OmniCalc Pro — Scientific & Financial Calculation Suite"));
      updateSessionProjectType(sessionId, "calculator");
    } else if (body.type === "investment_advisor" || body.type === "finance") {
      sessionPreviews.set(sessionId, generateInvestmentAdvisorHtml(body.title || "Hyper-Personalized Investment Advisor"));
      updateSessionProjectType(sessionId, "investment_advisor");
    } else if (body.type === "cosmetics_ecommerce") {
      sessionPreviews.set(sessionId, generateCosmeticsEcommerceHtml(body.title || "AuraBeauty — Cosmetics & Skincare Platform"));
      updateSessionProjectType(sessionId, "cosmetics_ecommerce");
    } else if (body.type === "ecommerce" || body.type === "shop") {
      const topicLower = ((body.topic || "") + " " + (body.title || "")).toLowerCase();
      if (
        topicLower.includes("cosmetic") ||
        topicLower.includes("skincare") ||
        topicLower.includes("skin care") ||
        topicLower.includes("facial kit") ||
        topicLower.includes("makeup") ||
        topicLower.includes("beauty") ||
        topicLower.includes("serum")
      ) {
        sessionPreviews.set(sessionId, generateCosmeticsEcommerceHtml(body.title || "AuraBeauty — Cosmetics & Skincare Platform"));
        updateSessionProjectType(sessionId, "cosmetics_ecommerce");
      } else {
        sessionPreviews.set(sessionId, defaultEcommerceHtml);
        updateSessionProjectType(sessionId, "ecommerce");
      }
    } else if (body.type === "custom") {
      sessionPreviews.set(sessionId, generateGenericAppHtml(body.topic || body.title || "Interactive Application"));
      updateSessionProjectType(sessionId, "custom", body.topic || body.title || "Interactive Application");
    } else if (body.topic) {
      const topicLower = (body.topic as string).toLowerCase();
      const isRoomCanvas =
        topicLower.includes("room canvas") ||
        topicLower.includes("virtual space") ||
        topicLower.includes("spatial canvas") ||
        topicLower.includes("presence avatar");

      const isFinance =
        topicLower.includes("invest") ||
        topicLower.includes("apexwealth") ||
        topicLower.includes("portfolio") ||
        topicLower.includes("robo advisor") ||
        topicLower.includes("wealth");

      const isCosmetics =
        topicLower.includes("cosmetic") ||
        topicLower.includes("skincare") ||
        topicLower.includes("skin care") ||
        topicLower.includes("facial kit") ||
        topicLower.includes("makeup") ||
        topicLower.includes("beauty") ||
        topicLower.includes("serum");

      const isEcom =
        topicLower.includes("auramart") ||
        topicLower.includes("ecommerce") ||
        topicLower.includes("e-commerce") ||
        topicLower.includes("online store") ||
        topicLower.includes("shopping cart");

      const isCalc =
        topicLower.includes("calc") ||
        topicLower.includes("cacu") ||
        topicLower.includes("calculator") ||
        topicLower.includes("arithmetic") ||
        topicLower.includes("math") ||
        (topicLower.includes("finance") && (topicLower.includes("calc") || topicLower.includes("cacu")));

      if (isRoomCanvas) {
        sessionPreviews.set(sessionId, generateRoomCanvasHtml(body.topic));
        updateSessionProjectType(sessionId, "room_canvas");
      } else if (isCalc) {
        sessionPreviews.set(sessionId, generateCalculatorHtml(body.topic));
        updateSessionProjectType(sessionId, "calculator");
      } else if (isFinance) {
        sessionPreviews.set(sessionId, generateInvestmentAdvisorHtml(body.topic));
        updateSessionProjectType(sessionId, "investment_advisor");
      } else if (isCosmetics) {
        sessionPreviews.set(sessionId, generateCosmeticsEcommerceHtml(body.topic));
        updateSessionProjectType(sessionId, "cosmetics_ecommerce");
      } else if (isEcom) {
        sessionPreviews.set(sessionId, defaultEcommerceHtml);
        updateSessionProjectType(sessionId, "ecommerce");
      } else {
        sessionPreviews.set(sessionId, generateGenericAppHtml(body.topic));
        updateSessionProjectType(sessionId, "custom", body.topic);
      }
    } else {
      sessionPreviews.set(sessionId, generateGenericAppHtml(body.title || "Generated Software"));
      updateSessionProjectType(sessionId, "custom", body.title || "Generated Software");
    }

    const previewUrl = `/api/preview?session=${encodeURIComponent(sessionId)}&t=${Date.now()}`;
    return NextResponse.json({ ok: true, previewUrl, sessionId });
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
}
