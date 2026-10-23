"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';

type Category = 'Rings' | 'Necklaces' | 'Earrings' | 'Bracelets';
type Metal = '18k Gold' | 'Rose Gold' | 'Platinum' | 'Sterling Silver';
type Gem = 'Diamond' | 'Sapphire' | 'Emerald' | 'Pearl' | 'None';
type SortKey = 'featured' | 'priceAsc' | 'priceDesc' | 'rating';
type ThemeKey = 'noir' | 'ivory' | 'emerald' | 'rose';
type View = 'catalog' | 'atelier' | 'wishlist' | 'orders';
type Karat = '14K' | '18K' | 'Platinum';
type Step = 'bag' | 'shipping' | 'payment' | 'done';

interface Product { id: number; name: string; category: Category; metal: Metal; gem: Gem; price: number; rating: number; reviews: number; stock: number; desc: string; img: string; }
interface CartLine { key: string; id: number; name: string; img: string; unit: number; qty: number; stock: number; karat: Karat; size: string; engraving: string; }
interface Order { id: string; tracking: string; date: string; total: number; items: number; gift: boolean; ship: string; status: string; }
interface Toast { id: number; msg: string; }
interface Msg { from: 'you' | 'concierge'; text: string; }

const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`;
const FALLBACK = U('1515562141207-7a88fb7ce338');
const POOL = [U('1605100804763-247f67b3557e'), U('1599643478518-a784e5d6d2a1'), U('1602751584552-8ba73aad10e1')];

const PRODUCTS: Product[] = [
  { id: 1, name: 'Solstice Solitaire', category: 'Rings', metal: '18k Gold', gem: 'Diamond', price: 3290, rating: 4.9, reviews: 128, stock: 5, desc: 'A brilliant-cut 0.7ct diamond held by six hand-polished claws.', img: U('1605100804763-247f67b3557e') },
  { id: 2, name: 'Lunar Halo Ring', category: 'Rings', metal: 'Platinum', gem: 'Diamond', price: 4850, rating: 4.8, reviews: 74, stock: 3, desc: 'Platinum halo of pave diamonds that catches every flicker of light.', img: U('1611591437281-460bfbe1220a') },
  { id: 3, name: 'Rosette Sapphire Band', category: 'Rings', metal: 'Rose Gold', gem: 'Sapphire', price: 1940, rating: 4.6, reviews: 51, stock: 12, desc: 'Ceylon sapphire cradled in a softly domed rose gold band.', img: U('1617038220319-276d3cfab638') },
  { id: 4, name: 'Aurora Pearl Pendant', category: 'Necklaces', metal: 'Sterling Silver', gem: 'Pearl', price: 480, rating: 4.4, reviews: 92, stock: 20, desc: 'Lustrous akoya pearl suspended from a fine sterling chain.', img: U('1599643478518-a784e5d6d2a1') },
  { id: 5, name: 'Golden Hour Chain', category: 'Necklaces', metal: '18k Gold', gem: 'None', price: 1520, rating: 4.7, reviews: 63, stock: 9, desc: 'Hand-linked solid gold chain with a signature toggle clasp.', img: U('1573408301185-9146fe634ad0') },
  { id: 6, name: 'Pearl Cascade', category: 'Necklaces', metal: 'Rose Gold', gem: 'Pearl', price: 2890, rating: 4.9, reviews: 40, stock: 4, desc: 'Graduated akoya pearls cascading on warm rose gold.', img: U('1535632066927-ab7c9ab60908') },
  { id: 7, name: 'Starlight Studs', category: 'Earrings', metal: 'Sterling Silver', gem: 'Diamond', price: 620, rating: 4.3, reviews: 210, stock: 30, desc: 'Everyday studs set with conflict-free diamonds.', img: U('1601121141461-9d6647bca1ed') },
  { id: 8, name: 'Empress Emerald Drops', category: 'Earrings', metal: '18k Gold', gem: 'Emerald', price: 2760, rating: 4.6, reviews: 36, stock: 6, desc: 'Colombian emerald drops framed in sculpted 18k gold.', img: U('1630019852942-f89202989a59') },
  { id: 9, name: 'Orbit Hoops', category: 'Earrings', metal: 'Platinum', gem: 'None', price: 1980, rating: 4.5, reviews: 29, stock: 0, desc: 'Sleek platinum hoops with a mirror finish.', img: U('1611652022419-a9419f74343d') },
  { id: 10, name: 'Infinity Cuff', category: 'Bracelets', metal: 'Sterling Silver', gem: 'None', price: 410, rating: 4.2, reviews: 58, stock: 15, desc: 'Open sterling cuff with an infinity motif.', img: U('1598560917807-1bae44bd2be8') },
  { id: 11, name: 'Sapphire Tennis', category: 'Bracelets', metal: 'Platinum', gem: 'Sapphire', price: 6200, rating: 5.0, reviews: 22, stock: 2, desc: 'A continuous line of blue sapphires in platinum.', img: U('1602751584552-8ba73aad10e1') },
  { id: 12, name: 'Sunbeam Bangle', category: 'Bracelets', metal: '18k Gold', gem: 'None', price: 1430, rating: 4.6, reviews: 47, stock: 11, desc: 'Polished solid gold bangle with a hidden clasp.', img: U('1515562141207-7a88fb7ce338') },
];

const KARAT_MULT: Record<Karat, number> = { '14K': 0.85, '18K': 1, 'Platinum': 1.3 };
const STONES: Record<string, { price: number; img: string }> = {
  Diamond: { price: 2400, img: U('1605100804763-247f67b3557e') },
  Sapphire: { price: 1800, img: U('1617038220319-276d3cfab638') },
  Emerald: { price: 2000, img: U('1630019852942-f89202989a59') },
  Morganite: { price: 900, img: U('1611591437281-460bfbe1220a') },
};
const GIFT_FEE = 25;
const PROMOS: Record<string, number> = { AURA10: 0.1, LUXE20: 0.2 };

const THEMES: Record<ThemeKey, { name: string; swatch: string; bg: string; panel: string; text: string; sub: string; accent: string; btn: string; ghost: string; input: string; on: string; off: string; drawer: string }> = {
  noir: { name: 'Maison Noir & Champagne Gold', swatch: 'bg-amber-300', bg: 'bg-neutral-950', panel: 'bg-neutral-900 border-amber-200/15', text: 'text-stone-100', sub: 'text-stone-400', accent: 'text-amber-300', btn: 'bg-amber-300 text-neutral-950 hover:bg-amber-200', ghost: 'border border-amber-200/30 hover:bg-amber-200/10', input: 'bg-neutral-800 border-amber-200/20 text-stone-100 placeholder-stone-500', on: 'bg-amber-300 text-neutral-950 border-amber-300', off: 'border-amber-200/20 text-stone-300 hover:border-amber-300', drawer: 'bg-neutral-950' },
  ivory: { name: 'Warm Ivory Atelier', swatch: 'bg-stone-800', bg: 'bg-stone-50', panel: 'bg-white border-stone-200', text: 'text-stone-900', sub: 'text-stone-500', accent: 'text-amber-700', btn: 'bg-stone-900 text-amber-50 hover:bg-stone-700', ghost: 'border border-stone-300 hover:bg-stone-100', input: 'bg-white border-stone-300 text-stone-900 placeholder-stone-400', on: 'bg-stone-900 text-amber-50 border-stone-900', off: 'border-stone-300 text-stone-600 hover:border-stone-900', drawer: 'bg-stone-50' },
  emerald: { name: 'Royal Emerald Velvet', swatch: 'bg-emerald-500', bg: 'bg-emerald-950', panel: 'bg-emerald-900/60 border-emerald-300/15', text: 'text-emerald-50', sub: 'text-emerald-200/70', accent: 'text-yellow-300', btn: 'bg-yellow-400 text-emerald-950 hover:bg-yellow-300', ghost: 'border border-emerald-300/30 hover:bg-emerald-300/10', input: 'bg-emerald-900 border-emerald-300/25 text-emerald-50 placeholder-emerald-300/50', on: 'bg-yellow-400 text-emerald-950 border-yellow-400', off: 'border-emerald-300/25 text-emerald-100 hover:border-yellow-300', drawer: 'bg-emerald-950' },
  rose: { name: 'Rose Quartz Daylight', swatch: 'bg-rose-300', bg: 'bg-rose-50', panel: 'bg-white border-rose-200', text: 'text-rose-950', sub: 'text-rose-700/70', accent: 'text-rose-600', btn: 'bg-rose-600 text-white hover:bg-rose-500', ghost: 'border border-rose-300 hover:bg-rose-100', input: 'bg-white border-rose-300 text-rose-950 placeholder-rose-300', on: 'bg-rose-600 text-white border-rose-600', off: 'border-rose-300 text-rose-800 hover:border-rose-600', drawer: 'bg-rose-50' },
};

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const unitPrice = (base: number, k: Karat) => Math.round(base * KARAT_MULT[k]);
const sizesFor = (c: Category | 'Custom') => c === 'Necklaces' ? ['16"', '18"', '20"'] : c === 'Bracelets' ? ['S', 'M', 'L'] : c === 'Earrings' ? ['One size'] : ['5', '6', '7', '8', '9'];
const imgFix = (e: React.SyntheticEvent<HTMLImageElement>) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; };

export function App() {
  const [theme, setTheme] = useState<ThemeKey>('noir');
  const [view, setView] = useState<View>('catalog');
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<Category | 'All'>('All');
  const [metals, setMetals] = useState<Metal[]>([]);
  const [gem, setGem] = useState<Gem | 'All'>('All');
  const [maxPrice, setMaxPrice] = useState(6500);
  const [sort, setSort] = useState<SortKey>('featured');
  const [grid, setGrid] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wish, setWish] = useState<number[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [karat, setKarat] = useState<Karat>('18K');
  const [size, setSize] = useState('');
  const [engrave, setEngrave] = useState('');
  const [gallery, setGallery] = useState(0);
  const [bagOpen, setBagOpen] = useState(false);
  const [step, setStep] = useState<Step>('bag');
  const [promo, setPromo] = useState('');
  const [discount, setDiscount] = useState(0);
  const [gift, setGift] = useState(false);
  const [ship, setShip] = useState({ name: '', address: '', city: '', method: 'standard' });
  const [pay, setPay] = useState<'card' | 'paypal' | 'transfer'>('card');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [stone, setStone] = useState('Diamond');
  const [aKarat, setAKarat] = useState<Karat>('18K');
  const [aSize, setASize] = useState('6');
  const [aEngrave, setAEngrave] = useState('');
  const [chat, setChat] = useState<Msg[]>([{ from: 'concierge', text: 'Welcome to AuraMart. How may our atelier assist you today?' }]);
  const [chatText, setChatText] = useState('');
  const t = THEMES[theme];

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('auramart-atelier') || 'null');
      if (s) { setCart(s.cart || []); setWish(s.wish || []); setOrders(s.orders || []); if (s.theme && THEMES[s.theme as ThemeKey]) setTheme(s.theme); }
    } catch { /* ignore corrupt storage */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem('auramart-atelier', JSON.stringify({ cart, wish, orders, theme })); } catch { /* storage full */ }
  }, [hydrated, cart, wish, orders, theme]);

  const notify = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setToasts(x => [...x, { id, msg }]);
    setTimeout(() => setToasts(x => x.filter(i => i.id !== id)), 2400);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let r = PRODUCTS.filter(p => (cat === 'All' || p.category === cat) && (!metals.length || metals.includes(p.metal)) && (gem === 'All' || p.gem === gem) && p.price <= maxPrice && (!q || `${p.name} ${p.gem} ${p.metal} ${p.category}`.toLowerCase().includes(q)));
    if (sort === 'priceAsc') r = [...r].sort((a, b) => a.price - b.price);
    if (sort === 'priceDesc') r = [...r].sort((a, b) => b.price - a.price);
    if (sort === 'rating') r = [...r].sort((a, b) => b.rating - a.rating);
    return r;
  }, [query, cat, metals, gem, maxPrice, sort]);

  const count = cart.reduce((s, l) => s + l.qty, 0);
  const subtotal = cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const discAmt = Math.round(subtotal * discount);
  const shipFee = !cart.length ? 0 : ship.method === 'express' ? 75 : subtotal - discAmt >= 2000 ? 0 : 35;
  const total = subtotal - discAmt + (gift ? GIFT_FEE : 0) + shipFee;
  const wished = PRODUCTS.filter(p => wish.includes(p.id));

  const addLine = useCallback((line: Omit<CartLine, 'qty'>) => {
    const sameProduct = cart.filter(c => c.id === line.id).reduce((s, c) => s + c.qty, 0);
    if (line.stock <= 0) { notify('This piece is currently sold out'); return false; }
    if (sameProduct >= line.stock) { notify('Maximum available stock reached'); return false; }
    setCart(c => c.some(x => x.key === line.key) ? c.map(x => x.key === line.key ? { ...x, qty: x.qty + 1 } : x) : [...c, { ...line, qty: 1 }]);
    notify(line.name + ' added to your bag');
    return true;
  }, [cart, notify]);

  const openProduct = (p: Product) => { setSelected(p); setKarat('18K'); setSize(sizesFor(p.category)[0]); setEngrave(''); setGallery(0); };
  const addCustomized = () => {
    if (!selected) return;
    const key = [selected.id, karat, size, engrave.trim()].join('|');
    if (addLine({ key, id: selected.id, name: selected.name, img: selected.img, unit: unitPrice(selected.price, karat), stock: selected.stock, karat, size, engraving: engrave.trim() })) setSelected(null);
  };
  const addQuick = (p: Product) => addLine({ key: [p.id, '18K', sizesFor(p.category)[0], ''].join('|'), id: p.id, name: p.name, img: p.img, unit: p.price, stock: p.stock, karat: '18K', size: sizesFor(p.category)[0], engraving: '' });
  const atelierPrice = Math.round((STONES[stone].price + 600) * KARAT_MULT[aKarat]);
  const addBespoke = () => {
    const key = ['bespoke', stone, aKarat, aSize, aEngrave.trim()].join('|');
    addLine({ key, id: 100, name: `Bespoke ${stone} Ring`, img: STONES[stone].img, unit: atelierPrice, stock: 10, karat: aKarat, size: aSize, engraving: aEngrave.trim() });
  };
  const changeQty = (key: string, d: number) => setCart(c => c.map(x => x.key === key ? { ...x, qty: Math.min(x.stock, x.qty + d) } : x).filter(x => x.qty > 0));
  const toggleWish = (id: number) => { setWish(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id]); };
  const toggleMetal = (m: Metal) => setMetals(x => x.includes(m) ? x.filter(i => i !== m) : [...x, m]);
  const applyPromo = () => {
    const d = PROMOS[promo.trim().toUpperCase()];
    setDiscount(d || 0);
    notify(d ? `${Math.round(d * 100)}% privilege applied` : 'Invalid promo code');
  };
  const resetFilters = () => { setQuery(''); setCat('All'); setMetals([]); setGem('All'); setMaxPrice(6500); setSort('featured'); };
  const shippingValid = ship.name.trim() && ship.address.trim() && ship.city.trim();
  const placeOrder = () => {
    const n = Math.floor(100000 + Math.random() * 900000);
    const o: Order = { id: 'AM-' + n, tracking: 'TRK' + n + 'LX', date: new Date().toLocaleDateString(), total, items: count, gift, ship: ship.method, status: 'Being prepared by our artisans' };
    setOrders(x => [o, ...x]); setLastOrder(o); setCart([]); setDiscount(0); setPromo(''); setGift(false); setStep('done');
  };
  const closeBag = () => { setBagOpen(false); if (step === 'done') setStep('bag'); };
  const sendChat = () => {
    const m = chatText.trim(); if (!m) return;
    setChat(c => [...c, { from: 'you', text: m }]); setChatText('');
    setTimeout(() => setChat(c => [...c, { from: 'concierge', text: 'Thank you — a personal concierge will reply within the hour regarding: "' + m.slice(0, 60) + '"' }]), 700);
  };

  const chip = (on: boolean) => `px-3 py-1.5 rounded-full text-xs border transition ${on ? t.on : t.off}`;
  const Img = ({ src, alt, cls }: { src: string; alt: string; cls: string }) => <img src={src} alt={alt} referrerPolicy="no-referrer" loading="lazy" onError={imgFix} className={cls} />;
  const Stars = ({ r }: { r: number }) => <span className="text-amber-400 text-xs"><i className="fa-solid fa-star"></i> {r.toFixed(1)}</span>;

  const card = (p: Product) => (
    <div key={p.id} className={`group rounded-2xl border overflow-hidden ${t.panel} ${grid ? 'flex flex-col' : 'flex flex-row'} hover:-translate-y-1 transition duration-300`}>
      <div className={`relative overflow-hidden cursor-pointer ${grid ? 'h-64' : 'w-40 sm:w-56 shrink-0'}`} onClick={() => openProduct(p)}>
        <Img src={p.img} alt={p.name} cls="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <button aria-label="Toggle wishlist" onClick={e => { e.stopPropagation(); toggleWish(p.id); }} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur text-white"><i className={`${wish.includes(p.id) ? 'fa-solid text-red-400' : 'fa-regular'} fa-heart`}></i></button>
        {p.stock === 0 && <span className="absolute top-3 left-3 text-xs bg-red-600 text-white px-2 py-0.5 rounded">Sold out</span>}
        {p.stock > 0 && p.stock <= 4 && <span className="absolute top-3 left-3 text-xs bg-amber-400 text-black px-2 py-0.5 rounded">Only {p.stock} left</span>}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <div className={`text-[11px] uppercase tracking-widest ${t.sub}`}>{p.category} · {p.metal}</div>
        <div className="font-serif text-lg">{p.name}</div>
        <div className="flex items-center gap-2"><Stars r={p.rating} /><span className={`text-xs ${t.sub}`}>({p.reviews})</span></div>
        {!grid && <p className={`text-sm ${t.sub}`}>{p.desc}</p>}
        <div className="flex items-center justify-between mt-auto pt-3">
          <span className={`font-serif text-xl ${t.accent}`}>{fmt(p.price)}</span>
          <div className="flex gap-1">
            <button onClick={() => openProduct(p)} className={`px-3 py-1.5 rounded-full text-sm ${t.ghost}`}>Customize</button>
            <button aria-label="Add to bag" disabled={p.stock === 0} onClick={() => addQuick(p)} className={`w-9 h-9 rounded-full disabled:opacity-40 ${t.btn}`}><i className="fa-solid fa-plus"></i></button>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs: [View, string, string][] = [['catalog', 'Collections', 'fa-gem'], ['atelier', 'Bespoke Atelier', 'fa-wand-magic-sparkles'], ['wishlist', `Wishlist (${wish.length})`, 'fa-heart'], ['orders', 'Orders & Concierge', 'fa-concierge-bell']];

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} transition-colors duration-500`}>
      <header className={`sticky top-0 z-30 backdrop-blur-xl border-b ${t.panel} bg-opacity-80`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="font-serif text-2xl tracking-wide flex items-center gap-2"><i className={`fa-solid fa-gem ${t.accent}`}></i>AuraMart</div>
          <nav className="flex flex-wrap gap-1 flex-1">
            {tabs.map(([k, l, i]) => <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 rounded-full text-sm border ${view === k ? t.on : 'border-transparent ' + t.sub}`}><i className={`fa-solid ${i} mr-1.5`}></i>{l}</button>)}
          </nav>
          <div className="flex items-center gap-1" role="group" aria-label="Theme">
            {(Object.keys(THEMES) as ThemeKey[]).map(k => <button key={k} title={THEMES[k].name} aria-label={THEMES[k].name} onClick={() => setTheme(k)} className={`w-6 h-6 rounded-full ${THEMES[k].swatch} ${theme === k ? 'ring-2 ring-offset-2 ring-current' : 'opacity-70'}`}></button>)}
          </div>
          <button onClick={() => { setBagOpen(true); setStep('bag'); }} className={`relative px-4 py-2 rounded-full text-sm font-medium ${t.btn}`}><i className="fa-solid fa-bag-shopping mr-2"></i>{fmt(subtotal)}
            {count > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{count}</span>}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'catalog' && (<>
          <section className="relative rounded-3xl overflow-hidden mb-8 min-h-[360px] flex items-end">
            <Img src={U('1515562141207-7a88fb7ce338')} alt="Fine jewellery" cls="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
            <div className="relative p-8 md:p-12 text-white max-w-2xl">
              <div className="uppercase tracking-[0.3em] text-xs text-amber-300 mb-3">The Spring Atelier Collection</div>
              <h1 className="font-serif text-4xl md:text-6xl leading-tight mb-3">Heirlooms, crafted for the moments that matter.</h1>
              <p className="text-stone-200 mb-5">Ethically sourced diamonds, GIA-certified stones and complimentary engraving on every piece.</p>
              <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={() => document.getElementById('grid')?.scrollIntoView({ behavior: 'smooth' })} className="px-5 py-2.5 rounded-full bg-amber-300 text-black font-medium">Shop collections</button>
                <button onClick={() => setView('atelier')} className="px-5 py-2.5 rounded-full border border-white/50">Design your ring</button>
              </div>
              <div className="flex gap-8 text-sm">
                {[['Pieces', PRODUCTS.length], ['Showing', filtered.length], ['Wishlist', wish.length], ['In bag', count]].map(([l, v]) => <div key={l as string}><div className="font-serif text-2xl text-amber-300">{v}</div><div className="text-stone-300 text-xs">{l}</div></div>)}
              </div>
            </div>
          </section>

          <div className={`rounded-2xl border p-4 mb-6 space-y-4 ${t.panel}`}>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]"><i className={`fa-solid fa-magnifying-glass absolute left-3 top-3 text-sm ${t.sub}`}></i>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search diamond, platinum, pendant..." className={`w-full pl-9 pr-3 py-2 rounded-full border outline-none ${t.input}`} /></div>
              <div className="flex gap-1">{([['featured', 'Featured'], ['priceAsc', 'Price ↑'], ['priceDesc', 'Price ↓'], ['rating', 'Top rated']] as [SortKey, string][]).map(([k, l]) => <button key={k} onClick={() => setSort(k)} className={chip(sort === k)}>{l}</button>)}</div>
              <div className="flex gap-1"><button aria-label="Grid view" onClick={() => setGrid(true)} className={chip(grid)}><i className="fa-solid fa-table-cells-large"></i></button><button aria-label="List view" onClick={() => setGrid(false)} className={chip(!grid)}><i className="fa-solid fa-list"></i></button></div>
            </div>
            <div className="flex flex-wrap gap-2">{(['All', 'Rings', 'Necklaces', 'Earrings', 'Bracelets'] as const).map(c => <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>)}</div>
            <div className="flex flex-wrap gap-2">{(['18k Gold', 'Rose Gold', 'Platinum', 'Sterling Silver'] as Metal[]).map(m => <button key={m} onClick={() => toggleMetal(m)} className={chip(metals.includes(m))}>{m}</button>)}</div>
            <div className="flex flex-wrap gap-2 items-center">{(['All', 'Diamond', 'Sapphire', 'Emerald', 'Pearl', 'None'] as const).map(g => <button key={g} onClick={() => setGem(g)} className={chip(gem === g)}>{g === 'None' ? 'Plain metal' : g}</button>)}
              <div className="ml-auto flex items-center gap-3 text-sm"><span>Up to <b className={t.accent}>{fmt(maxPrice)}</b></span><input type="range" aria-label="Max price" min={300} max={6500} step={100} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)} className="accent-amber-400" /><button onClick={resetFilters} className={`underline ${t.sub}`}>Reset</button></div></div>
          </div>

          <div id="grid">{filtered.length === 0 ? (
            <div className={`text-center py-20 ${t.sub}`}><i className="fa-regular fa-face-frown text-4xl mb-3"></i><p>No pieces match your filters.</p><button onClick={resetFilters} className={`mt-4 px-4 py-2 rounded-full ${t.btn}`}>Clear filters</button></div>
          ) : <div className={grid ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-5' : 'flex flex-col gap-4'}>{filtered.map(card)}</div>}</div>
        </>)}

        {view === 'atelier' && (
          <section className="grid md:grid-cols-2 gap-8">
            <div className="rounded-3xl overflow-hidden relative min-h-[420px]">
              <Img src={STONES[stone].img} alt={`${stone} ring`} cls="absolute inset-0 w-full h-full object-cover" />
              {aEngrave && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-5 py-2 rounded-full text-amber-200 font-serif italic">“{aEngrave}”</div>}
            </div>
            <div className={`rounded-3xl border p-6 space-y-5 ${t.panel}`}>
              <div><div className={`text-xs uppercase tracking-widest ${t.sub}`}>Bespoke Atelier</div><h2 className="font-serif text-3xl">Design your signature ring</h2></div>
              <div><div className="text-sm mb-2">Centre stone</div><div className="flex flex-wrap gap-2">{Object.keys(STONES).map(s => <button key={s} onClick={() => setStone(s)} className={chip(stone === s)}>{s} · {fmt(STONES[s].price)}</button>)}</div></div>
              <div><div className="text-sm mb-2">Metal</div><div className="flex gap-2">{(Object.keys(KARAT_MULT) as Karat[]).map(k => <button key={k} onClick={() => setAKarat(k)} className={chip(aKarat === k)}>{k}</button>)}</div></div>
              <div><div className="text-sm mb-2">Ring size</div><div className="flex gap-2">{sizesFor('Rings').map(s => <button key={s} onClick={() => setASize(s)} className={chip(aSize === s)}>{s}</button>)}</div></div>
              <div><div className="text-sm mb-2">Engraving ({aEngrave.length}/20)</div><input maxLength={20} value={aEngrave} onChange={e => setAEngrave(e.target.value)} placeholder="Forever yours" className={`w-full px-3 py-2 rounded-lg border outline-none ${t.input}`} /></div>
              <div className="flex items-center justify-between pt-2"><div><div className={`text-xs ${t.sub}`}>Estimated price</div><div className={`font-serif text-3xl ${t.accent}`}>{fmt(atelierPrice)}</div></div><button onClick={addBespoke} className={`px-6 py-3 rounded-full font-medium ${t.btn}`}>Commission this ring</button></div>
              <p className={`text-xs ${t.sub}`}><i className="fa-solid fa-certificate mr-1"></i>Every centre stone arrives with a GIA grading report.</p>
            </div>
          </section>
        )}

        {view === 'wishlist' && (
          <section><h2 className="font-serif text-3xl mb-5">Saved Wishlist</h2>
            {wished.length === 0 ? <div className={`text-center py-20 ${t.sub}`}><i className="fa-regular fa-heart text-4xl mb-3"></i><p>Tap the heart on any piece to save it here.</p><button onClick={() => setView('catalog')} className={`mt-4 px-4 py-2 rounded-full ${t.btn}`}>Browse collections</button></div>
              : <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{wished.map(p => card(p))}</div>}
          </section>
        )}

        {view === 'orders' && (
          <section className="grid md:grid-cols-2 gap-8">
            <div><h2 className="font-serif text-3xl mb-5">Your Orders</h2>
              {orders.length === 0 ? <p className={t.sub}>No orders yet. Your first acquisition will appear here with live tracking.</p> : orders.map(o => (
                <div key={o.id} className={`rounded-2xl border p-4 mb-3 ${t.panel}`}>
                  <div className="flex justify-between"><b>{o.id}</b><span className={t.accent}>{fmt(o.total)}</span></div>
                  <div className={`text-sm ${t.sub}`}>{o.date} · {o.items} item(s) · {o.ship} shipping{o.gift ? ' · gift wrapped' : ''}</div>
                  <div className="text-sm mt-1"><i className="fa-solid fa-truck mr-1"></i>{o.tracking} — {o.status}</div>
                </div>))}
            </div>
            <div className={`rounded-2xl border p-5 flex flex-col ${t.panel}`}><h2 className="font-serif text-2xl mb-3">Concierge</h2>
              <div className="flex-1 space-y-2 min-h-[220px] max-h-80 overflow-y-auto mb-3">{chat.map((m, i) => <div key={i} className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${m.from === 'you' ? 'ml-auto ' + t.on : t.ghost}`}>{m.text}</div>)}</div>
              <div className="flex gap-2"><input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Ask about sizing, care, gifting..." className={`flex-1 px-3 py-2 rounded-full border outline-none ${t.input}`} /><button onClick={sendChat} className={`px-4 rounded-full ${t.btn}`}><i className="fa-solid fa-paper-plane"></i></button></div>
            </div>
          </section>
        )}
      </main>

      {selected && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className={`w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border grid md:grid-cols-2 ${t.panel} ${t.text} ${t.drawer}`} onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <Img src={[selected.img, ...POOL][gallery]} alt={selected.name} cls="w-full h-80 object-cover rounded-2xl" />
              <div className="flex gap-2 mt-3">{[selected.img, ...POOL].map((s, i) => <button key={i} aria-label={`Image ${i + 1}`} onClick={() => setGallery(i)} className={`rounded-lg overflow-hidden border-2 ${gallery === i ? 'border-amber-400' : 'border-transparent opacity-70'}`}><Img src={s} alt="thumbnail" cls="w-16 h-16 object-cover" /></button>)}</div>
              <div className={`mt-3 text-xs ${t.sub}`}><i className="fa-solid fa-certificate text-amber-400 mr-1"></i>GIA certified · {selected.gem === 'None' ? 'solid precious metal' : selected.gem + ' grading report included'}</div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start"><div><div className={`text-xs uppercase tracking-widest ${t.sub}`}>{selected.category} · {selected.metal}</div><h2 className="font-serif text-3xl">{selected.name}</h2><Stars r={selected.rating} /> <span className={`text-xs ${t.sub}`}>{selected.reviews} reviews</span></div><button aria-label="Close" onClick={() => setSelected(null)}><i className="fa-solid fa-xmark text-xl"></i></button></div>
              <p className={`text-sm ${t.sub}`}>{selected.desc}</p>
              <div><div className="text-sm mb-2">Metal karat</div><div className="flex gap-2">{(Object.keys(KARAT_MULT) as Karat[]).map(k => <button key={k} onClick={() => setKarat(k)} className={chip(karat === k)}>{k}</button>)}</div></div>
              <div><div className="text-sm mb-2">{selected.category === 'Rings' ? 'Ring size' : selected.category === 'Necklaces' ? 'Chain length' : 'Size'}</div><div className="flex gap-2">{sizesFor(selected.category).map(s => <button key={s} onClick={() => setSize(s)} className={chip(size === s)}>{s}</button>)}</div></div>
              <div><div className="text-sm mb-2">Complimentary engraving ({engrave.length}/20)</div><input maxLength={20} value={engrave} onChange={e => setEngrave(e.target.value)} placeholder="Your message" className={`w-full px-3 py-2 rounded-lg border outline-none ${t.input}`} />
                {engrave && <div className="mt-2 text-center py-2 rounded-lg bg-gradient-to-r from-amber-200/20 via-amber-100/30 to-amber-200/20 font-serif italic text-amber-500">“{engrave}”</div>}</div>
              <div className={`text-sm ${selected.stock === 0 ? 'text-red-400' : selected.stock <= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>{selected.stock === 0 ? 'Sold out' : `${selected.stock} available`}</div>
              <div className="flex items-center justify-between"><span className={`font-serif text-3xl ${t.accent}`}>{fmt(unitPrice(selected.price, karat))}</span>
                <div className="flex gap-2"><button aria-label="Toggle wishlist" onClick={() => toggleWish(selected.id)} className={`w-11 h-11 rounded-full ${t.ghost}`}><i className={`${wish.includes(selected.id) ? 'fa-solid text-red-400' : 'fa-regular'} fa-heart`}></i></button>
                  <button disabled={selected.stock === 0} onClick={addCustomized} className={`px-5 rounded-full font-medium disabled:opacity-40 ${t.btn}`}>Add to bag</button></div></div>
            </div>
          </div>
        </div>
      )}

      {bagOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 flex justify-end" onClick={closeBag}>
          <aside className={`w-full max-w-md h-full p-5 overflow-y-auto border-l ${t.panel} ${t.text} ${t.drawer}`} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4"><h2 className="font-serif text-2xl">{step === 'bag' ? `Luxury Bag (${count})` : step === 'shipping' ? 'Shipping' : step === 'payment' ? 'Payment' : 'Confirmed'}</h2><button aria-label="Close bag" onClick={closeBag}><i className="fa-solid fa-xmark text-xl"></i></button></div>
            {step !== 'done' && <div className="flex gap-1 mb-4">{(['bag', 'shipping', 'payment'] as Step[]).map((s, i) => <div key={s} className={`h-1 flex-1 rounded ${i <= ['bag', 'shipping', 'payment'].indexOf(step) ? 'bg-amber-400' : 'bg-white/20'}`}></div>)}</div>}

            {step === 'bag' && (cart.length === 0 ? <p className={t.sub}>Your bag is empty.</p> : (<>
              {cart.map(l => (
                <div key={l.key} className="flex gap-3 py-3 border-b border-white/10">
                  <Img src={l.img} alt={l.name} cls="w-20 h-20 rounded-lg object-cover" />
                  <div className="flex-1 text-sm"><div className="font-serif text-base">{l.name}</div><div className={t.sub}>{l.karat} · Size {l.size}</div>{l.engraving && <div className={`italic ${t.accent}`}>“{l.engraving}”</div>}
                    <div className="flex items-center gap-2 mt-1"><button aria-label="Decrease" onClick={() => changeQty(l.key, -1)} className={`w-6 h-6 rounded-full ${t.btn}`}>-</button><span>{l.qty}</span><button aria-label="Increase" onClick={() => changeQty(l.key, 1)} className={`w-6 h-6 rounded-full ${t.btn}`}>+</button>
                      <button aria-label="Remove" onClick={() => setCart(c => c.filter(x => x.key !== l.key))} className="ml-auto text-red-400"><i className="fa-solid fa-trash"></i></button></div></div>
                  <div className="text-sm font-medium">{fmt(l.unit * l.qty)}</div>
                </div>))}
              <div className="flex gap-2 mt-4"><input value={promo} onChange={e => setPromo(e.target.value)} placeholder="Promo: AURA10, LUXE20" className={`flex-1 px-3 py-2 rounded-full border outline-none ${t.input}`} /><button onClick={applyPromo} className={`px-4 rounded-full ${t.btn}`}>Apply</button></div>
              <button onClick={() => setGift(g => !g)} className={`w-full mt-4 flex items-center justify-between p-3 rounded-xl border ${t.panel}`}><span><i className="fa-solid fa-gift mr-2"></i>Signature gift wrapping (+{fmt(GIFT_FEE)})</span><span className={`w-10 h-5 rounded-full relative ${gift ? 'bg-amber-400' : 'bg-white/20'}`}><span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${gift ? 'left-5' : 'left-0.5'}`}></span></span></button>
            </>))}

            {step === 'shipping' && (
              <div className="space-y-3">
                {(['name', 'address', 'city'] as const).map(f => <input key={f} value={ship[f]} onChange={e => setShip(s => ({ ...s, [f]: e.target.value }))} placeholder={f === 'name' ? 'Full name' : f === 'address' ? 'Street address' : 'City & postcode'} className={`w-full px-3 py-2 rounded-lg border outline-none ${t.input}`} />)}
                <div className="flex gap-2">{[['standard', 'Insured Standard'], ['express', 'Express (+$75)']].map(([k, l]) => <button key={k} onClick={() => setShip(s => ({ ...s, method: k }))} className={chip(ship.method === k)}>{l}</button>)}</div>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-2">{([['card', 'Credit / debit card', 'fa-credit-card'], ['paypal', 'PayPal', 'fa-brands fa-paypal'], ['transfer', 'Bank transfer', 'fa-building-columns']] as const).map(([k, l, i]) => (
                <button key={k} onClick={() => setPay(k)} className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 ${pay === k ? t.on : t.off}`}><i className={`${i.includes('brands') ? i : 'fa-solid ' + i}`}></i>{l}</button>))}
                <p className={`text-xs ${t.sub}`}>Paying with {pay === 'card' ? 'card' : pay === 'paypal' ? 'PayPal' : 'bank transfer'} · fully insured and encrypted.</p></div>
            )}

            {step === 'done' && lastOrder && (
              <div className="text-center py-6"><i className={`fa-solid fa-circle-check text-5xl mb-3 ${t.accent}`}></i><h3 className="font-serif text-2xl">Thank you, {ship.name || 'valued client'}</h3>
                <p className={`my-2 ${t.sub}`}>Order <b>{lastOrder.id}</b> is being prepared by our artisans.</p><p className="text-sm">Tracking ID: <b>{lastOrder.tracking}</b></p>
                <div className="flex gap-2 justify-center mt-5"><button onClick={() => { closeBag(); setView('orders'); }} className={`px-4 py-2 rounded-full ${t.btn}`}>View order</button><button onClick={closeBag} className={`px-4 py-2 rounded-full ${t.ghost}`}>Continue shopping</button></div></div>
            )}

            {step !== 'done' && cart.length > 0 && (
              <div className="mt-5 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                {discAmt > 0 && <div className="flex justify-between text-emerald-400"><span>Privilege ({Math.round(discount * 100)}%)</span><span>-{fmt(discAmt)}</span></div>}
                {gift && <div className="flex justify-between"><span>Gift wrapping</span><span>{fmt(GIFT_FEE)}</span></div>}
                <div className="flex justify-between"><span>Shipping</span><span>{shipFee ? fmt(shipFee) : 'Complimentary'}</span></div>
                <div className="flex justify-between font-serif text-xl pt-2"><span>Total</span><span className={t.accent}>{fmt(total)}</span></div>
                <div className="flex gap-2 pt-3">
                  {step !== 'bag' && <button onClick={() => setStep(step === 'payment' ? 'shipping' : 'bag')} className={`px-4 py-3 rounded-full ${t.ghost}`}>Back</button>}
                  {step === 'bag' && <button onClick={() => setStep('shipping')} className={`flex-1 py-3 rounded-full font-medium ${t.btn}`}>Proceed to shipping</button>}
                  {step === 'shipping' && <button disabled={!shippingValid} onClick={() => setStep('payment')} className={`flex-1 py-3 rounded-full font-medium disabled:opacity-40 ${t.btn}`}>Continue to payment</button>}
                  {step === 'payment' && <button onClick={placeOrder} className={`flex-1 py-3 rounded-full font-medium ${t.btn}`}>Place order · {fmt(total)}</button>}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="fixed bottom-4 left-4 z-50 space-y-2">{toasts.map(x => <div key={x.id} className="bg-black/85 text-white text-sm px-4 py-2 rounded-full shadow-lg">{x.msg}</div>)}</div>
    </div>
  );
}

export default App;
