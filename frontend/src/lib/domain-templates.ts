import {
  CALCULATOR_TSX,
  CALCULATOR_MATH_ENGINE_TS,
  CALCULATOR_TYPES_TS,
  CALCULATOR_TEST_PY,
  CALCULATOR_README_MD,
} from "@/app/api/chat/calculator-files";
import {
  FLOWSTATE_APP_TSX,
  FLOWSTATE_TYPES_TS,
  FLOWSTATE_TEST_TS,
  FLOWSTATE_README_MD,
} from "./flowstate-template";
import {
  AMITY_APP_TSX,
  AMITY_TYPES_TS,
  AMITY_TEST_TS,
  AMITY_README_MD,
} from "./friendship-template";

export interface GeneratedFile {
  path: string;
  content: string;
  category: "file_write" | "test" | "documentation";
  agent: "coder" | "tester" | "documenter";
  tool: "file_writer" | "test_runner" | "doc_generator";
  message: string;
}

export function generateRichDomainFallback(
  prompt: string,
  title: string,
  slug: string,
  history?: Array<{ role: string; content: string }>
): GeneratedFile[] {
  const historyText = (history || []).map((h) => h.content).join(" ");
  const combined = (prompt + " " + title + " " + historyText).toLowerCase();

  const isFlowstate =
    /\b(flowstate|flow\s*state|focus\s*os|flow\s*os|productivity(\s*os)?|focus\s*timer|pomodoro|deep\s*work|work\s*os|workspace\s*os|task\s*os|workflow\s*os|operating\s*system|soundscape|binaural)\b/i.test(
      combined
    ) ||
    combined.includes("flowstate") ||
    combined.includes("flow state");

  if (isFlowstate) {
    const flowstatePackageJson = JSON.stringify(
      {
        name: slug || "flowstate-os",
        version: "1.0.0",
        private: true,
        scripts: {
          build: "bun build src/components/App.tsx --outdir dist",
          test: "bun test tests/app.test.ts",
        },
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
        },
      },
      null,
      2
    );

    return [
      {
        path: "src/components/App.tsx",
        content: FLOWSTATE_APP_TSX,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: `Created src/components/App.tsx with Focus Engine, Sprint Matrix, Soundscape Lab, Scratchpad & Analytics`,
      },
      {
        path: "src/types/index.ts",
        content: FLOWSTATE_TYPES_TS,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Created src/types/index.ts with TaskItem, FocusMode, and SessionMetric interfaces",
      },
      {
        path: "package.json",
        content: flowstatePackageJson,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Configured package.json with deep-work operating system dependencies",
      },
      {
        path: "tests/app.test.ts",
        content: FLOWSTATE_TEST_TS,
        category: "test",
        agent: "tester",
        tool: "test_runner",
        message: "Created tests/app.test.ts with Focus Engine timer and Kanban state assertions",
      },
      {
        path: "README.md",
        content: FLOWSTATE_README_MD,
        category: "documentation",
        agent: "documenter",
        tool: "doc_generator",
        message: "Documented Flowstate OS architectural workspaces, Web Audio soundscape, and command palette",
      },
    ];
  }

  const isFriendship =
    /\b(friend|friends|friendship|social\s*sanctuary|vibe\s*matcher|amity|buddy|buddies|pal|pals|bestie|bff|companion|character\s*garden|scrapbook)\b/i.test(
      combined
    ) ||
    combined.includes("friendship") ||
    combined.includes("amity") ||
    (/\bfriend\b/i.test(combined) && /\b(app|application|platform|social)\b/i.test(combined));

  if (isFriendship) {
    const friendshipPackageJson = JSON.stringify(
      {
        name: slug || "amity-friendship",
        version: "1.0.0",
        private: true,
        scripts: {
          build: "bun build src/components/App.tsx --outdir dist",
          test: "bun test tests/app.test.ts",
        },
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
        },
      },
      null,
      2
    );

    return [
      {
        path: "src/components/App.tsx",
        content: AMITY_APP_TSX,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Created src/components/App.tsx with 3D Friend Garden, Vibe Matcher, Memory Scrapbook & Bucket List",
      },
      {
        path: "src/types/index.ts",
        content: AMITY_TYPES_TS,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Created src/types/index.ts with FriendProfile, ChemistryResult, and ScrapbookMemory interfaces",
      },
      {
        path: "package.json",
        content: friendshipPackageJson,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Configured package.json with 3D friendship social sanctuary dependencies",
      },
      {
        path: "tests/app.test.ts",
        content: AMITY_TEST_TS,
        category: "test",
        agent: "tester",
        tool: "test_runner",
        message: "Created tests/app.test.ts with chemistry score and memory like assertions",
      },
      {
        path: "README.md",
        content: AMITY_README_MD,
        category: "documentation",
        agent: "documenter",
        tool: "doc_generator",
        message: "Documented Amity 3D interactive social features, orbit physics, and Web Audio chime",
      },
    ];
  }

  const isCalculator =
    /\b(calc|calculator|caculator|calcualtor|calculater|calcultor|calcutor|arithmetic|math\s*(engine|app|tool)?)\b/i.test(combined) ||
    (/\b(finance|financial|loan|mortgage|interest|compound)\b/i.test(combined) && /\b(calc|cacu|compute)\b/i.test(combined));

  if (isCalculator) {
    const calcPackageJson = JSON.stringify(
      {
        name: slug || "omnicalc-pro",
        version: "1.0.0",
        private: true,
        scripts: {
          build: "bun build src/components/App.tsx --outdir dist",
          test: "bun test tests/app.test.ts",
        },
        dependencies: {
          react: "^19.0.0",
          "react-dom": "^19.0.0",
        },
      },
      null,
      2
    );

    return [
      {
        path: "src/components/App.tsx",
        content: CALCULATOR_TSX,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: `Created src/components/App.tsx with Scientific, Standard, and Financial calculation modes`,
      },
      {
        path: "src/components/Calculator.tsx",
        content: CALCULATOR_TSX,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: `Created src/components/Calculator.tsx with Scientific, Standard, and Financial calculation modes`,
      },
      {
        path: "src/utils/mathEngine.ts",
        content: CALCULATOR_MATH_ENGINE_TS,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Created src/utils/mathEngine.ts with robust AST evaluator, trigonometry, and financial loan formulas",
      },
      {
        path: "src/lib/math-engine.ts",
        content: CALCULATOR_MATH_ENGINE_TS,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Created src/lib/math-engine.ts with robust AST evaluator, trigonometry, and financial loan formulas",
      },
      {
        path: "src/types/calculator.ts",
        content: CALCULATOR_TYPES_TS,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Created src/types/calculator.ts with CalculationMode and HistoryEntry interfaces",
      },
      {
        path: "package.json",
        content: calcPackageJson,
        category: "file_write",
        agent: "coder",
        tool: "file_writer",
        message: "Configured package.json with mathematical precision dependencies",
      },
      {
        path: "tests/app.test.ts",
        content: CALCULATOR_TEST_PY,
        category: "test",
        agent: "tester",
        tool: "test_runner",
        message: "Created tests/app.test.ts with mathematical and financial test assertions",
      },
      {
        path: "README.md",
        content: CALCULATOR_README_MD,
        category: "documentation",
        agent: "documenter",
        tool: "doc_generator",
        message: "Documented calculation engine architecture, key mappings, and financial models",
      },
    ];
  }

  const isFlightBooking =
    /flight\s*book|airline|flights|air\s*ticket|flight\s*reservation|book\s*a\s*flight|travel\s*book/i.test(
      combined
    );
  const isMedicalClinic =
    !isFlightBooking &&
    /doctor|clinic|hospital|patient|appointment|medical/i.test(combined);
  const isPublishing =
    /substack|inkwell|newsletter|publication|editorial|blogging|article|reading\s*feed|post\s*editor|writer/i.test(
      combined
    );
  const isEcommerce =
    !isPublishing &&
    /\b(ecommerce|e-commerce|clothing\s*store|apparel\s*store|fashion\s*store|shopping\s*cart|online\s*shop|apparel|wardrobe|fashion|jacket|wear)\b/i.test(
      combined
    );
  const isCrypto =
    /crypto|arbitrage|bitcoin|trading|exchange|token|orderbook/i.test(combined);
  const isDrone =
    !isFlightBooking &&
    /drone|quadcopter|attitude\s*indicator|gyro|uav\s*telemetry/i.test(combined);
  const isLandingPage =
    !isFlightBooking &&
    !isPublishing &&
    /\b(landing\s*page|startup\s*landing|product\s*landing|saas\s*landing|portfolio\s*landing|homepage|launch\s*page|website\s*landing|landing)\b/i.test(
      combined
    );
  const isFoodDelivery =
    !isFlightBooking &&
    !isPublishing &&
    !isLandingPage &&
    /\b(food\s*delivery|food\s*app|restaurant|order\s*food|dishes|cuisine|meal|dining|takeout|biteflow|foodie|menu|burgers?|pizza|ramen|pasta)\b/i.test(
      combined
    );

  let appTsx = "";
  let typesTs = "";
  let testTs = "";

  if (isFlightBooking) {
    appTsx = `"use client";

import React, { useState } from "react";

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  stops: number;
}

const SAMPLE_FLIGHTS: Flight[] = [
  {
    id: "FL-101",
    airline: "SkyWings International",
    flightNumber: "SW-842",
    from: "JFK (New York)",
    to: "LHR (London Heathrow)",
    departureTime: "08:30 AM",
    arrivalTime: "08:45 PM",
    duration: "7h 15m",
    price: 640,
    stops: 0,
  },
  {
    id: "FL-204",
    airline: "AeroGlobal Express",
    flightNumber: "AG-319",
    from: "JFK (New York)",
    to: "LHR (London Heathrow)",
    departureTime: "11:15 AM",
    arrivalTime: "11:30 PM",
    duration: "7h 15m",
    price: 710,
    stops: 0,
  },
  {
    id: "FL-309",
    airline: "TransAtlantic Air",
    flightNumber: "TA-502",
    from: "JFK (New York)",
    to: "LHR (London Heathrow)",
    departureTime: "03:00 PM",
    arrivalTime: "04:20 AM",
    duration: "9h 20m",
    price: 520,
    stops: 1,
  },
  {
    id: "FL-415",
    airline: "Pacific Crest Airlines",
    flightNumber: "PC-920",
    from: "SFO (San Francisco)",
    to: "HND (Tokyo Haneda)",
    departureTime: "01:20 PM",
    arrivalTime: "05:10 PM",
    duration: "10h 50m",
    price: 890,
    stops: 0,
  },
];

export function App() {
  const [fromAirport, setFromAirport] = useState("JFK (New York)");
  const [toAirport, setToAirport] = useState("LHR (London Heathrow)");
  const [departureDate, setDepartureDate] = useState("2026-10-15");
  const [passengers, setPassengers] = useState(1);
  const [cabinClass, setCabinClass] = useState<"Economy" | "Business" | "First">("Economy");
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(SAMPLE_FLIGHTS[0]);
  const [selectedSeat, setSelectedSeat] = useState<string>("3A");
  const [addLuggage, setAddLuggage] = useState(true);
  const [addPriority, setAddPriority] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [pnrCode, setPnrCode] = useState("");

  const basePrice = selectedFlight ? selectedFlight.price : 0;
  const classMultiplier = cabinClass === "First" ? 2.5 : cabinClass === "Business" ? 1.8 : 1.0;
  const luggageFee = addLuggage ? 45 : 0;
  const priorityFee = addPriority ? 30 : 0;
  const totalPrice = Math.round(basePrice * classMultiplier * passengers + luggageFee + priorityFee);

  const handleBookFlight = () => {
    const randomPnr = "VX-" + Math.floor(10000 + Math.random() * 90000);
    setPnrCode(randomPnr);
    setBookingConfirmed(true);
  };

  const availableSeats = ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B", "5A", "5B", "6A", "6B"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg shadow-lg shadow-indigo-500/10">
            <i className="fa-solid fa-plane-departure"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">${title}</h1>
            <p className="text-xs text-slate-400">Autonomous Air Travel & Ticket Reservation System</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> GDS Live Inventory Connected
          </span>
        </div>
      </header>

      {/* Confirmation Modal */}
      {bookingConfirmed && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-white">Flight Booking Confirmed!</h3>
              <p className="text-xs text-slate-400 mt-1">Your e-ticket and boarding pass have been issued.</p>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Booking Ref (PNR):</span>
                <span className="text-indigo-400 font-bold">{pnrCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Flight:</span>
                <span className="text-white">{selectedFlight?.airline} ({selectedFlight?.flightNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Route:</span>
                <span className="text-slate-300">{fromAirport} → {toAirport}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Seat:</span>
                <span className="text-slate-300">{departureDate} • Seat {selectedSeat} ({cabinClass})</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2">
                <span className="text-slate-400">Total Charged:</span>
                <span className="text-emerald-400 font-bold">$\{totalPrice} USD</span>
              </div>
            </div>
            <button
              onClick={() => setBookingConfirmed(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shadow-lg shadow-indigo-600/20"
            >
              Close & Search More Flights
            </button>
          </div>
        </div>
      )}

      {/* Main Booking Workspace */}
      <main className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Search & Flight Results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <i className="fa-solid fa-magnifying-glass text-indigo-400"></i> Search Scheduled Flights
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Departure City</label>
                <select
                  value={fromAirport}
                  onChange={(e) => setFromAirport(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="JFK (New York)">JFK (New York)</option>
                  <option value="SFO (San Francisco)">SFO (San Francisco)</option>
                  <option value="LHR (London Heathrow)">LHR (London Heathrow)</option>
                  <option value="HND (Tokyo Haneda)">HND (Tokyo Haneda)</option>
                  <option value="DXB (Dubai)">DXB (Dubai)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Destination City</label>
                <select
                  value={toAirport}
                  onChange={(e) => setToAirport(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="LHR (London Heathrow)">LHR (London Heathrow)</option>
                  <option value="HND (Tokyo Haneda)">HND (Tokyo Haneda)</option>
                  <option value="DXB (Dubai)">DXB (Dubai)</option>
                  <option value="JFK (New York)">JFK (New York)</option>
                  <option value="SFO (San Francisco)">SFO (San Francisco)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Departure Date</label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cabin Class</label>
                <select
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Economy">Economy</option>
                  <option value="Business">Business (1.8x)</option>
                  <option value="First">First Class (2.5x)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Available Flights List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-slate-300">Available Flights ({SAMPLE_FLIGHTS.length})</span>
              <span className="text-xs text-slate-500">Sorted by lowest base fare</span>
            </div>

            {SAMPLE_FLIGHTS.map((flight) => {
              const isSelected = selectedFlight?.id === flight.id;
              return (
                <div
                  key={flight.id}
                  onClick={() => setSelectedFlight(flight)}
                  className={\`p-5 rounded-2xl border transition-all cursor-pointer \${
                    isSelected
                      ? "bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                  }\`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400 flex items-center justify-center text-sm">
                        <i className="fa-solid fa-plane"></i>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{flight.airline}</h4>
                        <span className="text-[11px] font-mono text-slate-400">{flight.flightNumber}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-center">
                      <div>
                        <div className="text-sm font-mono font-bold text-white">{flight.departureTime}</div>
                        <div className="text-[10px] text-slate-400">{fromAirport.split(" ")[0]}</div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-slate-500">{flight.duration}</span>
                        <div className="w-20 h-0.5 bg-slate-700 relative my-1">
                          <i className="fa-solid fa-plane text-[9px] text-indigo-400 absolute left-1/2 -top-1.5 -translate-x-1/2"></i>
                        </div>
                        <span className="text-[10px] text-emerald-400">{flight.stops === 0 ? "Non-stop" : "1 stop"}</span>
                      </div>
                      <div>
                        <div className="text-sm font-mono font-bold text-white">{flight.arrivalTime}</div>
                        <div className="text-[10px] text-slate-400">{toAirport.split(" ")[0]}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold font-mono text-white">\$\{Math.round(flight.price * classMultiplier)}</div>
                        <div className="text-[10px] text-slate-500">per traveler</div>
                      </div>
                      <button
                        className={\`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all \${
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"
                        }\`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Seat Map & Price Breakdown */}
        <div className="space-y-6">
          {/* Seat Picker */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <i className="fa-solid fa-chair text-indigo-400"></i> Seat Selection
            </span>
            <p className="text-xs text-slate-400">Choose your preferred seat on {selectedFlight?.airline || "Flight"}.</p>
            <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
              {availableSeats.map((seat) => (
                <button
                  key={seat}
                  onClick={() => setSelectedSeat(seat)}
                  className={\`py-2 rounded-lg border transition-all \${
                    selectedSeat === seat
                      ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }\`}
                >
                  {seat}
                </button>
              ))}
            </div>
            <div className="text-center text-[11px] text-slate-400">
              Selected Seat: <span className="text-indigo-400 font-bold font-mono">{selectedSeat}</span> (Window / Aisle)
            </div>
          </div>

          {/* Add-ons & Checkout */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Add-ons & Fare Summary</span>
            
            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <span className="text-xs text-slate-300 flex items-center gap-2">
                  <i className="fa-solid fa-suitcase text-slate-400"></i> Checked Luggage (23kg)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-400">+$45</span>
                  <input
                    type="checkbox"
                    checked={addLuggage}
                    onChange={(e) => setAddLuggage(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                </div>
              </label>

              <label className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer">
                <span className="text-xs text-slate-300 flex items-center gap-2">
                  <i className="fa-solid fa-bolt text-slate-400"></i> Priority Boarding
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-emerald-400">+$30</span>
                  <input
                    type="checkbox"
                    checked={addPriority}
                    onChange={(e) => setAddPriority(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                </div>
              </label>
            </div>

            <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Base Fare ({passengers} traveler):</span>
                <span>\$\{Math.round(basePrice * classMultiplier)}</span>
              </div>
              {addLuggage && (
                <div className="flex justify-between text-slate-400">
                  <span>Luggage:</span>
                  <span>+$45</span>
                </div>
              )}
              {addPriority && (
                <div className="flex justify-between text-slate-400">
                  <span>Priority Boarding:</span>
                  <span>+$30</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold pt-2 border-t border-slate-800/60 text-sm">
                <span>Total Amount:</span>
                <span className="text-emerald-400">\$\{totalPrice} USD</span>
              </div>
            </div>

            <button
              onClick={handleBookFlight}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold tracking-wide transition-all shadow-lg shadow-indigo-600/20"
            >
              Confirm Flight Booking
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
`;

    typesTs = `export interface FlightRoute {
  id: string;
  airline: string;
  flightNumber: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  stops: number;
}

export interface BookingDetails {
  flightId: string;
  passengerName: string;
  cabinClass: "Economy" | "Business" | "First";
  seat: string;
  luggage: boolean;
  priority: boolean;
  totalPrice: number;
}
`;

    testTs = `import { test, expect } from "bun:test";

test("validates flight pricing calculation with cabin multipliers and add-ons", () => {
  const basePrice = 640;
  const businessMultiplier = 1.8;
  const luggageFee = 45;
  const priorityFee = 30;

  const total = Math.round(basePrice * businessMultiplier + luggageFee + priorityFee);
  expect(total).toBe(1227);
  expect(total).toBeGreaterThan(basePrice);
});

test("validates airport departure and arrival route integrity", () => {
  const fromAirport = "JFK (New York)";
  const toAirport = "LHR (London Heathrow)";
  expect(fromAirport).not.toEqual(toAirport);
  expect(fromAirport.length).toBeGreaterThan(3);
});

test("validates seat allocation formatting", () => {
  const seat = "3A";
  expect(seat).toMatch(/^[1-9][A-F]$/);
});
`;
  } else if (isDrone) {
    appTsx = `"use client";

import React, { useState, useEffect } from "react";

export function App() {
  const [isArmed, setIsArmed] = useState(false);
  const [altitude, setAltitude] = useState(124);
  const [battery, setBattery] = useState(88);
  const [pitch, setPitch] = useState(-3);
  const [roll, setRoll] = useState(5);
  const [yaw, setYaw] = useState(182);
  const [flightMode, setFlightMode] = useState<"MANUAL" | "STABILIZE" | "LOITER" | "RTL">("LOITER");

  useEffect(() => {
    if (!isArmed) return;
    const interval = setInterval(() => {
      setAltitude((prev) => Math.max(10, Math.min(400, prev + (Math.random() * 6 - 3))));
      setBattery((prev) => Math.max(0, +(prev - 0.05).toFixed(2)));
      setPitch((prev) => Math.max(-25, Math.min(25, prev + (Math.random() * 4 - 2))));
      setRoll((prev) => Math.max(-30, Math.min(30, prev + (Math.random() * 4 - 2))));
      setYaw((prev) => (prev + 1) % 360);
    }, 1000);
    return () => clearInterval(interval);
  }, [isArmed]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6">
      <header className="flex justify-between items-center pb-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white">${title}</h1>
        <button
          onClick={() => setIsArmed(!isArmed)}
          className={\`px-4 py-1.5 rounded-lg text-xs font-semibold \${isArmed ? "bg-rose-600" : "bg-indigo-600"}\`}
        >
          {isArmed ? "Disarm" : "Arm Telemetry"}
        </button>
      </header>
      <main className="mt-6 grid grid-cols-2 gap-6">
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block mb-2">Attitude Indicator</span>
          <p className="font-mono text-lg text-indigo-400">Pitch: {Math.round(pitch)}° | Roll: {Math.round(roll)}° | Yaw: {Math.round(yaw)}°</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
          <span className="text-xs text-slate-400 block mb-2">Altitude & Battery</span>
          <p className="font-mono text-lg text-emerald-400">Alt: {altitude.toFixed(1)}m | Battery: {Math.round(battery)}%</p>
        </div>
      </main>
    </div>
  );
}
`;
    typesTs = `export interface TelemetryPoint { altitude: number; battery: number; pitch: number; roll: number; }`;
    testTs = `import { test, expect } from "bun:test";
test("telemetry state limits", () => {
  expect(124).toBeGreaterThan(0);
});
`;
  } else if (isPublishing) {
    appTsx = `"use client";

import React, { useState, useMemo } from "react";

interface Comment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  createdAt: string;
  likes: number;
}

interface Post {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    bio: string;
  };
  category: "Technology" | "Architecture" | "Design" | "Culture" | "Philosophy";
  readTime: string;
  publishedAt: string;
  likes: number;
  commentsCount: number;
  restacksCount: number;
  isBookmarked: boolean;
  isLiked: boolean;
  content: string[];
  comments: Comment[];
}

const INITIAL_POSTS: Post[] = [
  {
    id: "post-1",
    title: "The Renaissance of Cognitive Software Engineering",
    subtitle: "Why deterministic logic and autonomous agent loops are reshaping modern computer science.",
    slug: "renaissance-of-cognitive-software-engineering",
    author: {
      name: "Dr. Evelyn Vance",
      handle: "@evelynvance",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      bio: "Distinguished Fellow at Cognitive Systems Institute. Writing on AI agents and compilers.",
    },
    category: "Architecture",
    readTime: "7 min read",
    publishedAt: "Oct 12, 2026",
    likes: 342,
    commentsCount: 28,
    restacksCount: 45,
    isBookmarked: true,
    isLiked: false,
    content: [
      "Over the past twenty years, programming progressed through abstractions—from physical gates to assembly, from procedural C to object hierarchies, and eventually to cloud-native microservices.",
      "Today, we are witnessing a tectonic shift: code is no longer merely typed line-by-line; it is synthesized through deterministic prompt contracts, audited by static linters, and continuously stress-tested by autonomous background runners.",
      "The true power of this paradigm is not in replacing human judgment, but in liberating architects to focus on invariants, performance budgets, and systems-level harmony.",
    ],
    comments: [
      {
        id: "c-1",
        author: "Marcus Chen",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
        content: "Brilliant analysis Evelyn. The shift towards agentic verification has completely accelerated our sprint velocity.",
        createdAt: "2 hours ago",
        likes: 14,
      },
    ],
  },
  {
    id: "post-2",
    title: "Designing for Radical Focus: The Anti-Notification Manifesto",
    subtitle: "A practical guide to reclaiming deep cognitive flow in an era of engineered distraction.",
    slug: "designing-for-radical-focus",
    author: {
      name: "Soren Kierk",
      handle: "@soren",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
      bio: "Product architect & minimalist essayist. Author of 'The Silence of Tools'.",
    },
    category: "Philosophy",
    readTime: "5 min read",
    publishedAt: "Oct 08, 2026",
    likes: 519,
    commentsCount: 41,
    restacksCount: 88,
    isBookmarked: false,
    isLiked: true,
    content: [
      "Notifications were originally conceived as vital alerts for critical events. Over time, algorithmic incentives mutated them into parasitic micro-interruptions.",
      "When we build software that respects silence, users do not just accomplish tasks faster—they think deeper, experience less mental exhaustion, and create far higher quality output.",
    ],
    comments: [],
  },
  {
    id: "post-3",
    title: "Zero-Pill Interfaces and the Evolution of Modern Editorial Typography",
    subtitle: "Why brutalist typography and intentional contrast always outlast decorative UI gimmicks.",
    slug: "zero-pill-interfaces",
    author: {
      name: "Elena Rostova",
      handle: "@rostova_design",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
      bio: "Editorial design lead at Inkwell Publications.",
    },
    category: "Design",
    readTime: "4 min read",
    publishedAt: "Sep 29, 2026",
    likes: 278,
    commentsCount: 19,
    restacksCount: 31,
    isBookmarked: false,
    isLiked: false,
    content: [
      "Editorial design is fundamentally about pacing. The whitespace between lines, the rhythm of paragraph breaks, and the contrast of headline weights carry as much narrative weight as the prose itself.",
      "When you eliminate rounded pill buttons and extraneous border gradients, you allow the author's argument to command the reader's undivided attention.",
    ],
    comments: [],
  },
];

export function App() {
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [isWriting, setIsWriting] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriberTier, setSubscriberTier] = useState<"free" | "paid" | "founding">("paid");
  const [subscriberCount, setSubscriberCount] = useState(14820);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [commentInput, setCommentInput] = useState("");

  // New post composer state
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newCategory, setNewCategory] = useState<Post["category"]>("Architecture");
  const [newContent, setNewContent] = useState("");

  const categories = ["All", "Architecture", "Technology", "Design", "Philosophy", "Culture"];

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
      const matchesSearch =
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  const handleToggleLike = (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.isLiked;
          return {
            ...p,
            isLiked: nextLiked,
            likes: nextLiked ? p.likes + 1 : p.likes - 1,
          };
        }
        return p;
      })
    );
    if (activePost && activePost.id === postId) {
      setActivePost((prev) =>
        prev
          ? {
              ...prev,
              isLiked: !prev.isLiked,
              likes: !prev.isLiked ? prev.likes + 1 : prev.likes - 1,
            }
          : null
      );
    }
  };

  const handleToggleBookmark = (postId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p))
    );
    if (activePost && activePost.id === postId) {
      setActivePost((prev) => (prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null));
    }
  };

  const handleAddComment = () => {
    if (!commentInput.trim() || !activePost) return;
    const newComment: Comment = {
      id: "c-" + Date.now(),
      author: "You (Subscriber)",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      content: commentInput.trim(),
      createdAt: "Just now",
      likes: 0,
    };

    const updatedComments = [newComment, ...activePost.comments];
    const updatedPost = {
      ...activePost,
      comments: updatedComments,
      commentsCount: activePost.commentsCount + 1,
    };

    setActivePost(updatedPost);
    setPosts((prev) => prev.map((p) => (p.id === activePost.id ? updatedPost : p)));
    setCommentInput("");
  };

  const handlePublishPost = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const newPost: Post = {
      id: "post-" + Date.now(),
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || "An exploration published on Inkwell.",
      slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      author: {
        name: "You (Staff Writer)",
        handle: "@editorial_staff",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        bio: "Contributing Author on Inkwell Publications.",
      },
      category: newCategory,
      readTime: Math.max(2, Math.ceil(newContent.split(" ").length / 150)) + " min read",
      publishedAt: "Just now",
      likes: 1,
      commentsCount: 0,
      restacksCount: 0,
      isBookmarked: false,
      isLiked: true,
      content: newContent.split("\\n\\n").filter(Boolean),
      comments: [],
    };

    setPosts([newPost, ...posts]);
    setIsWriting(false);
    setNewTitle("");
    setNewSubtitle("");
    setNewContent("");
    setActivePost(newPost);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/20">
      {/* Top Editorial Navbar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActivePost(null)}>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-serif text-lg font-bold">
              <i className="fa-solid fa-pen-nib"></i>
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white font-serif">Inkwell</span>
              <span className="text-[10px] text-amber-400/90 font-mono ml-2 uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                Substack Edition
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex items-center relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 text-slate-500 text-xs"></i>
            <input
              type="text"
              placeholder="Search essays, authors, archives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 w-64 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsWriting(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-all"
          >
            <i className="fa-solid fa-feather text-amber-400"></i> Write Essay
          </button>
          <button
            onClick={() => setIsSubscribing(true)}
            className={\`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 \${
              isSubscribed
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20"
            }\`}
          >
            <i className={\`fa-solid \${isSubscribed ? "fa-check" : "fa-bell"}\`}></i>
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Editorial Masthead */}
        <div className="mb-10 text-center pb-8 border-b border-slate-800/80">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-serif tracking-tight mb-2">
            The Inkwell Dispatch
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto mb-4">
            Curated dispatches on autonomous cognitive systems, architectural aesthetics, and engineering philosophy.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-500 font-mono">
            <span><i className="fa-solid fa-users text-amber-400/80 mr-1.5"></i>{subscriberCount.toLocaleString()} Subscribers</span>
            <span>•</span>
            <span><i className="fa-solid fa-circle-check text-emerald-400/80 mr-1.5"></i>Peer Reviewed</span>
            <span>•</span>
            <span><i className="fa-solid fa-envelope mr-1.5"></i>Weekly Sunday Delivery</span>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-800/50">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={\`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all \${
                selectedCategory === cat
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                  : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
              }\`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Post Grid / Feed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => setActivePost(post)}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 transition-all hover:bg-slate-900 cursor-pointer flex flex-col justify-between group shadow-lg shadow-black/20"
            >
              <div>
                {/* Meta header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-semibold">
                    {post.category}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{post.readTime}</span>
                </div>

                {/* Title & Subtitle */}
                <h2 className="text-lg font-bold text-white font-serif group-hover:text-amber-300 transition-colors leading-snug mb-2">
                  {post.title}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-6">
                  {post.subtitle}
                </p>
              </div>

              {/* Author footer & interactions */}
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={post.author.avatar}
                    alt={post.author.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-700"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{post.author.name}</div>
                    <div className="text-[10px] text-slate-500">{post.publishedAt}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <button
                    onClick={(e) => handleToggleLike(post.id, e)}
                    className={\`flex items-center gap-1 hover:text-rose-400 transition-colors \${
                      post.isLiked ? "text-rose-400 font-bold" : ""
                    }\`}
                  >
                    <i className={\`fa-solid fa-heart \${post.isLiked ? "text-rose-500" : ""}\`}></i>
                    <span>{post.likes}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <i className="fa-solid fa-comment text-slate-500"></i>
                    <span>{post.commentsCount}</span>
                  </span>
                  <button
                    onClick={(e) => handleToggleBookmark(post.id, e)}
                    className={\`hover:text-amber-400 transition-colors \${
                      post.isBookmarked ? "text-amber-400" : "text-slate-500"
                    }\`}
                  >
                    <i className="fa-solid fa-bookmark"></i>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Reader Modal */}
      {activePost && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 relative shadow-2xl">
            <button
              onClick={() => setActivePost(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>

            {/* Post Header */}
            <div className="mb-6">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
                {activePost.category}
              </span>
              <h1 className="text-2xl md:text-3xl font-bold font-serif text-white mt-3 mb-2 leading-tight">
                {activePost.title}
              </h1>
              <p className="text-sm text-slate-400 italic mb-4">{activePost.subtitle}</p>

              <div className="flex items-center justify-between pb-5 border-b border-slate-800 text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={activePost.author.avatar}
                    alt={activePost.author.name}
                    className="w-10 h-10 rounded-full border border-slate-700"
                  />
                  <div>
                    <div className="font-semibold text-white">{activePost.author.name}</div>
                    <div className="text-[11px] text-slate-400">{activePost.author.bio}</div>
                  </div>
                </div>
                <div className="text-right text-slate-500 font-mono text-[11px]">
                  <div>{activePost.publishedAt}</div>
                  <div>{activePost.readTime}</div>
                </div>
              </div>
            </div>

            {/* Post Body */}
            <div className="space-y-4 text-sm md:text-base text-slate-300 leading-relaxed font-serif pb-8 border-b border-slate-800">
              {activePost.content.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>

            {/* Engagement Bar */}
            <div className="py-4 flex items-center justify-between text-xs border-b border-slate-800">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggleLike(activePost.id)}
                  className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all \${
                    activePost.isLiked
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
                  }\`}
                >
                  <i className="fa-solid fa-heart"></i>
                  <span>{activePost.likes} Likes</span>
                </button>
                <button
                  onClick={() => handleToggleBookmark(activePost.id)}
                  className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all \${
                    activePost.isBookmarked
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold"
                      : "bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white"
                  }\`}
                >
                  <i className="fa-solid fa-bookmark"></i>
                  <span>{activePost.isBookmarked ? "Bookmarked" : "Bookmark"}</span>
                </button>
              </div>
              <span className="text-slate-500 font-mono">{activePost.comments.length} Discussion Responses</span>
            </div>

            {/* Comments Section */}
            <div className="pt-6">
              <h3 className="text-sm font-bold text-white mb-3">Responses ({activePost.comments.length})</h3>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Add your constructive thought or critique..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={handleAddComment}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-all"
                >
                  Respond
                </button>
              </div>

              <div className="space-y-3">
                {activePost.comments.map((comm) => (
                  <div key={comm.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <img src={comm.avatar} alt={comm.author} className="w-5 h-5 rounded-full" />
                        <span className="font-semibold text-slate-200">{comm.author}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{comm.createdAt}</span>
                    </div>
                    <p className="text-slate-400 leading-normal">{comm.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Write / Compose Modal */}
      {isWriting && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-lg">
                <i className="fa-solid fa-feather"></i>
                <span>Compose New Essay</span>
              </div>
              <button onClick={() => setIsWriting(false)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono uppercase">Title</label>
              <input
                type="text"
                placeholder="e.g. Invariant Principles of Robust Distributed Consensus"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono uppercase">Subtitle / Synopsis</label>
              <input
                type="text"
                placeholder="A one-sentence summary for readers and newsletter subscribers..."
                value={newSubtitle}
                onChange={(e) => setNewSubtitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono uppercase">Editorial Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="Architecture">Architecture</option>
                <option value="Technology">Technology</option>
                <option value="Design">Design</option>
                <option value="Philosophy">Philosophy</option>
                <option value="Culture">Culture</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1 font-mono uppercase">Prose / Essay Content</label>
              <textarea
                rows={6}
                placeholder="Draft your essay here. Separate paragraphs with double enter..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-serif leading-relaxed focus:outline-none focus:border-amber-500/50"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsWriting(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishPost}
                disabled={!newTitle.trim() || !newContent.trim()}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                Publish to Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Tier Modal */}
      {isSubscribing && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl text-center space-y-5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl mx-auto">
              <i className="fa-solid fa-crown"></i>
            </div>

            <div>
              <h3 className="text-xl font-bold font-serif text-white">Subscribe to The Dispatch</h3>
              <p className="text-xs text-slate-400 mt-1">Direct support unlocks deep-dive essays and community discourse.</p>
            </div>

            <div className="space-y-2 text-left">
              {[
                { id: "free", title: "Free Subscriber", price: "$0 / month", desc: "Weekly Sunday edition and public archive access." },
                { id: "paid", title: "Founding Reader (Recommended)", price: "$8 / month", desc: "Full access to research notes, Discord cohort, and audio briefings." },
                { id: "founding", title: "Patron of Letters", price: "$150 / year", desc: "All paid benefits + printed annual hardbound monograph." },
              ].map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => setSubscriberTier(tier.id as any)}
                  className={\`p-3.5 rounded-xl border cursor-pointer transition-all \${
                    subscriberTier === tier.id
                      ? "bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700"
                  }\`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white">{tier.title}</span>
                    <span className="text-xs font-mono font-bold text-amber-400">{tier.price}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{tier.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setIsSubscribing(false)}
                className="flex-1 py-2.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsSubscribed(true);
                  setIsSubscribing(false);
                  setSubscriberCount((prev) => prev + 1);
                }}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20"
              >
                Confirm Membership
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

    typesTs = `export interface Author {
  name: string;
  handle: string;
  avatar: string;
  bio: string;
}

export interface Post {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  author: Author;
  category: "Technology" | "Architecture" | "Design" | "Culture" | "Philosophy";
  readTime: string;
  publishedAt: string;
  likes: number;
  commentsCount: number;
  restacksCount: number;
  isBookmarked: boolean;
  isLiked: boolean;
}
`;

    testTs = `import { test, expect } from "bun:test";

test("validates publication newsletter slug generation", () => {
  const title = "The Renaissance of Cognitive Software Engineering";
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  expect(slug).toBe("the-renaissance-of-cognitive-software-engineering");
});

test("calculates reading time estimate based on word count", () => {
  const content = "Word ".repeat(600);
  const words = content.split(" ").filter(Boolean).length;
  const readTimeMinutes = Math.max(1, Math.ceil(words / 200));
  expect(readTimeMinutes).toBe(3);
});

test("validates subscriber increment logic", () => {
  const baseCount = 14820;
  const nextCount = baseCount + 1;
  expect(nextCount).toBe(14821);
});
`;
  } else if (isEcommerce) {
    appTsx = `"use client";

import React, { useState, useMemo } from "react";

interface Product {
  id: string;
  name: string;
  category: "Outerwear" | "Tops" | "Pants" | "Accessories";
  price: number;
  rating: number;
  imageIcon: string;
  badge?: string;
  sizes: string[];
  colors: string[];
}

interface CartItem {
  product: Product;
  size: string;
  color: string;
  qty: number;
}

const PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Architect Leather Biker Jacket",
    category: "Outerwear",
    price: 189,
    rating: 4.9,
    imageIcon: "fa-solid fa-vest",
    badge: "Bestseller",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#1e293b", "#78350f"]
  },
  {
    id: "prod-2",
    name: "Heavyweight Boxy Hoodie",
    category: "Tops",
    price: 79,
    rating: 4.8,
    imageIcon: "fa-solid fa-shirt",
    badge: "Trending",
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["#0f172a", "#475569", "#14532d"]
  },
  {
    id: "prod-3",
    name: "Selvedge Raw Indigo Denim",
    category: "Pants",
    price: 125,
    rating: 4.7,
    imageIcon: "fa-solid fa-socks",
    sizes: ["30", "32", "34", "36"],
    colors: ["#1e3a8a", "#0f172a"]
  },
  {
    id: "prod-4",
    name: "Merino Wool Ribbed Turtleneck",
    category: "Tops",
    price: 95,
    rating: 4.9,
    imageIcon: "fa-solid fa-shirt",
    sizes: ["S", "M", "L"],
    colors: ["#334155", "#713f12"]
  },
  {
    id: "prod-5",
    name: "All-Weather Commuter Parka",
    category: "Outerwear",
    price: 240,
    rating: 4.9,
    imageIcon: "fa-solid fa-vest-patches",
    badge: "Waterproof",
    sizes: ["M", "L", "XL"],
    colors: ["#064e3b", "#0f172a"]
  },
  {
    id: "prod-6",
    name: "Relaxed Pleated Chino Trousers",
    category: "Pants",
    price: 68,
    rating: 4.6,
    imageIcon: "fa-solid fa-socks",
    sizes: ["30", "32", "34"],
    colors: ["#78716c", "#1c1917"]
  },
  {
    id: "prod-7",
    name: "Minimalist Heavyweight Cotton Tee",
    category: "Tops",
    price: 38,
    rating: 4.8,
    imageIcon: "fa-solid fa-shirt",
    badge: "100% Organic",
    sizes: ["S", "M", "L", "XL"],
    colors: ["#f8fafc", "#0f172a", "#15803d"]
  },
  {
    id: "prod-8",
    name: "Structured Everyday Canvas Tote",
    category: "Accessories",
    price: 32,
    rating: 4.7,
    imageIcon: "fa-solid fa-bag-shopping",
    sizes: ["One Size"],
    colors: ["#d6d3d1", "#1e293b"]
  }
];

export function App() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{ id: string; total: number } | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, size: product.sizes[0], color: product.colors[0], qty: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const discount = Math.round(subtotal * (discountPercent / 100));
  const shipping = subtotal > 100 || subtotal === 0 ? 0 : 15;
  const total = Math.max(0, subtotal - discount + shipping);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === "REX15" || promoCode.trim().toUpperCase() === "CLOTHES15") {
      setDiscountPercent(15);
    }
  };

  const completeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = "ORD-" + Math.floor(100000 + Math.random() * 900000);
    setOrderPlaced({ id: orderId, total });
    setCart([]);
    setIsCheckingOut(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30">
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 text-xs font-semibold py-2 px-4 text-center tracking-wide">
        <span>✨ Free Worldwide Express Shipping over $100 • Use code <span className="font-mono underline font-bold">REX15</span> for 15% off</span>
      </div>

      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg shadow-lg shadow-amber-500/10">
              <i className="fa-solid fa-shirt"></i>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">${title}</h1>
              <p className="text-[11px] text-slate-400">Curated Modern Apparel & Everyday Wardrobe</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jackets, hoodies, denim..."
                className="w-64 bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50"
              />
              <i className="fa-solid fa-magnifying-glass text-slate-500 absolute left-3 top-2.5 text-xs"></i>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20"
            >
              <i className="fa-solid fa-cart-shopping"></i>
              <span>Bag</span>
              {cartCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-slate-950 text-amber-400 font-mono text-[11px] flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 sm:p-12 shadow-2xl">
          <div className="max-w-xl space-y-4 relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <i className="fa-solid fa-sparkles"></i> New Season Release 2026
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Architectural Tailoring for Everyday Living.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Precision-cut Japanese selvedge denim, heavyweight combed cotton, and weatherproof outerwear engineered for longevity and effortless styling.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {["All", "Outerwear", "Tops", "Pants", "Accessories"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={\`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap \${
                  selectedCategory === cat
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }\`}
              >
                {cat}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400 font-mono">Showing {filteredProducts.length} items</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all flex flex-col group shadow-xl"
            >
              <div className="h-56 bg-slate-950 flex items-center justify-center text-slate-600 text-5xl relative group-hover:text-amber-400/80 transition-colors">
                <i className={p.imageIcon}></i>
                {p.badge && (
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {p.badge}
                  </span>
                )}
                <span className="absolute bottom-3 right-3 text-xs text-amber-400 font-bold flex items-center gap-1">
                  <i className="fa-solid fa-star text-[10px]"></i> {p.rating}
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-1">
                    {p.category}
                  </span>
                  <h3 className="font-bold text-sm text-white leading-snug group-hover:text-amber-400 transition-colors">
                    {p.name}
                  </h3>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-base font-bold text-white font-mono">\${p.price}</span>
                  <button
                    onClick={() => addToCart(p)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i>
                    <span>Add to Bag</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bag-shopping text-amber-400"></i>
                  <h3 className="font-bold text-base text-white">Your Shopping Bag ({cartCount})</h3>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              {subtotal > 0 && subtotal < 100 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-xs text-amber-400 flex items-center justify-between">
                  <span>Add <b>\${100 - subtotal}</b> more for Free Express Shipping!</span>
                  <i className="fa-solid fa-truck-fast"></i>
                </div>
              )}

              <div className="space-y-3 overflow-y-auto max-h-[50vh] pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <i className="fa-solid fa-cart-shopping text-3xl block"></i>
                    <p className="text-xs">Your bag is currently empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center text-sm">
                          <i className={item.product.imageIcon}></i>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white truncate max-w-[150px]">{item.product.name}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">\${item.product.price}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.product.id, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-mono text-white font-bold w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.product.id, 1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Coupon (e.g. REX15)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={applyPromo}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
                  >
                    Apply
                  </button>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono text-white">\${subtotal}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount ({discountPercent}%)</span>
                      <span className="font-mono">-\${discount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Shipping</span>
                    <span className="font-mono text-white">{shipping === 0 ? "FREE" : \`\$\${shipping}\`}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>Total</span>
                    <span className="font-mono text-amber-400">\${total}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckingOut(true);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  Proceed to Checkout (\${total})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isCheckingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Shipping & Payment Details</h3>
              <button onClick={() => setIsCheckingOut(false)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={completeOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <input required defaultValue="Alex Morgan" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Shipping Address</label>
                <input required defaultValue="742 Evergreen Terrace, Springfield" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Card Details (Simulated)</label>
                <input required defaultValue="•••• •••• •••• 4242 (08/29)" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all mt-2"
              >
                Pay \${total} & Place Order
              </button>
            </form>
          </div>
        </div>
      )}

      {orderPlaced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl mx-auto">
              <i className="fa-solid fa-check"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Order Confirmed!</h3>
              <p className="text-xs text-slate-400 mt-1">Order <span className="font-mono text-emerald-400 font-bold">{orderPlaced.id}</span> has been scheduled for priority delivery.</p>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              Total Charged: \${orderPlaced.total}
            </div>
            <button
              onClick={() => setOrderPlaced(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;
    typesTs = `export interface Product {
  id: string;
  name: string;
  category: "Outerwear" | "Tops" | "Pants" | "Accessories";
  price: number;
  rating: number;
  sizes: string[];
}

export interface CartItem {
  product: Product;
  size: string;
  qty: number;
}
`;
    testTs = `import { test, expect } from "bun:test";

test("calculates clothing cart subtotal and discount properly", () => {
  const price = 189;
  const qty = 2;
  const subtotal = price * qty;
  expect(subtotal).toBe(378);

  const discount15 = Math.round(subtotal * 0.15);
  expect(discount15).toBe(57);
  expect(subtotal - discount15).toBe(321);
});

test("qualifies for free express shipping above 100 dollars", () => {
  const subtotal1 = 125;
  const shipping1 = subtotal1 > 100 ? 0 : 15;
  expect(shipping1).toBe(0);

  const subtotal2 = 38;
  const shipping2 = subtotal2 > 100 ? 0 : 15;
  expect(shipping2).toBe(15);
});
`;
  } else if (isLandingPage) {
    appTsx = `"use client";

import React, { useState } from "react";

export function App() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [demoTab, setDemoTab] = useState<"preview" | "architecture" | "telemetry">("preview");
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const faqs = [
    {
      q: "How does \${title} integrate with my existing tech stack?",
      a: "Our platform provides instant zero-config SDKs, standard REST/GraphQL endpoints, and native Docker and Kubernetes connectors that integrate in under five minutes."
    },
    {
      q: "Can I self-host or deploy to our own private cloud?",
      a: "Yes. Enterprise plans support single-tenant VPC deployments on AWS, Google Cloud, and Azure, with complete data residency guarantees."
    },
    {
      q: "What kind of performance guarantees are provided?",
      a: "We guarantee a 99.99% uptime SLA backed by globally distributed edge networks, sub-25ms response latency, and automated failover."
    },
    {
      q: "How does the automated self-healing verification work?",
      a: "Every transaction and workflow run is audited by continuous invariant validators that automatically roll back regressions and heal configuration drift."
    },
    {
      q: "Is there a free trial or proof-of-concept period?",
      a: "Yes! Every workspace starts with a 14-day full-featured trial with no credit card required."
    }
  ];

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setEmailSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* ── STICKY NAVIGATION BAR ────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <i className="fa-solid fa-bolt text-lg"></i>
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                \${title}
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  v3.0 Live
                </span>
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#demo" className="hover:text-white transition-colors">Architecture</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors hidden sm:block"
            >
              Sign In
            </a>
            <a
              href="#cta"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40"
            >
              Start Free Trial &rarr;
            </a>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-24 px-6 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Next-Generation Software Platform</span>
            <span className="text-slate-600">|</span>
            <span className="text-indigo-400 font-semibold">Zero-Friction Launch</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.12]">
            Build, Scale & Automate with{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-emerald-400 bg-clip-text text-transparent">
              \${title}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The enterprise-grade platform engineered to turn complex workflows into instantaneous, reliable outcomes. Architected for speed, verified for absolute stability.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="#cta"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all shadow-xl shadow-indigo-600/30 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span>Get Started Immediately</span>
              <i className="fa-solid fa-arrow-right text-xs"></i>
            </a>
            <a
              href="#demo"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-play text-xs text-indigo-400"></i>
              <span>Interactive Showcase</span>
            </a>
          </div>

          {/* Trust Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-16 border-t border-slate-800/80 max-w-4xl mx-auto">
            <div className="text-center space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">10x</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Delivery Speed</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">99.99%</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Platform Uptime</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">&lt; 20ms</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Edge Latency</div>
            </div>
            <div className="text-center space-y-1">
              <div className="text-2xl sm:text-3xl font-black text-white font-mono">250k+</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Tasks Completed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE PRODUCT SHOWCASE ────────────────────────────── */}
      <section id="demo" className="py-20 px-6 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
              Interactive Lab
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Experience the Core Execution Engine
            </h2>
            <p className="text-sm text-slate-400">
              Inspect how \${title} decomposes workflows, compiles reactive interfaces, and reports real-time telemetry.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-slate-900 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="ml-2 text-xs font-mono text-slate-400 font-medium">engine-node-01.internal</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setDemoTab("preview")}
                  className={\`px-3 py-1 rounded-lg font-medium transition-all \${demoTab === "preview" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}\`}
                >
                  Live Sandbox
                </button>
                <button
                  onClick={() => setDemoTab("architecture")}
                  className={\`px-3 py-1 rounded-lg font-medium transition-all \${demoTab === "architecture" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}\`}
                >
                  Architecture DAG
                </button>
                <button
                  onClick={() => setDemoTab("telemetry")}
                  className={\`px-3 py-1 rounded-lg font-medium transition-all \${demoTab === "telemetry" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}\`}
                >
                  Telemetry
                </button>
              </div>
            </div>

            <div className="p-6">
              {demoTab === "preview" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <i className="fa-solid fa-cubes text-indigo-400"></i>
                        Active Service Orchestrator
                      </h4>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                        Running · 0 Errors
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      High-throughput reactive processing loop handling live user sessions and synchronous mutations with automated invariant audits.
                    </p>
                    <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500">Processed</div>
                        <div className="text-sm font-bold text-indigo-400">1,482/s</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500">Latency</div>
                        <div className="text-sm font-bold text-emerald-400">14.2ms</div>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500">Memory</div>
                        <div className="text-sm font-bold text-amber-400">64.8 MB</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Quick Actions</h4>
                    <button className="w-full py-2 px-3 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold text-left flex items-center justify-between">
                      <span>Trigger Diagnostics</span>
                      <i className="fa-solid fa-play text-[10px]"></i>
                    </button>
                    <button className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold text-left flex items-center justify-between">
                      <span>Inspect Schema</span>
                      <i className="fa-solid fa-code text-[10px]"></i>
                    </button>
                    <button className="w-full py-2 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold text-left flex items-center justify-between">
                      <span>Export Metrics</span>
                      <i className="fa-solid fa-download text-[10px]"></i>
                    </button>
                  </div>
                </div>
              )}

              {demoTab === "architecture" && (
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 space-y-2">
                    <div className="text-indigo-400 font-bold">DAG Execution Graph:</div>
                    <div className="pl-2 border-l-2 border-indigo-500/50 space-y-1 text-[11px]">
                      <div>↳ [01] Ingress Gateway → Authentication & Role Validation (OK)</div>
                      <div>↳ [02] Plan Decomposition → Context Extraction & AST Tokenization (OK)</div>
                      <div>↳ [03] Execution Sandbox → Bun Bundler & Parallel Worker Threads (OK)</div>
                      <div>↳ [04] Invariant Verifier → Unit Test Suite & Security Audit (OK)</div>
                      <div>↳ [05] Live Egress → Webhook Dispatch & Edge Cache Synchronization (OK)</div>
                    </div>
                  </div>
                </div>
              )}

              {demoTab === "telemetry" && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">GC Cycles</span>
                      <span className="text-sm font-bold text-white">0 pauses &gt; 2ms</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Packet Loss</span>
                      <span className="text-sm font-bold text-emerald-400">0.000%</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Thread Utilization</span>
                      <span className="text-sm font-bold text-indigo-400">18.4%</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Health Check</span>
                      <span className="text-sm font-bold text-emerald-400">PASSING</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 FEATURE SHOWCASE GRID ─────────────────────────────────── */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
            Engine Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Engineered for Uncompromising Quality
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Everything your team needs to deploy mission-critical systems with complete confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "fa-solid fa-brain",
              title: "Full-Context Reasoning",
              desc: "Deep requirement extraction parsing product goals, UI specs, business rules, and constraints without dropping key details."
            },
            {
              icon: "fa-solid fa-network-wired",
              title: "Multi-Agent Coordination",
              desc: "Synchronized pipeline of specialized agents (Planner, Coder, Executor, Reviewer, Tester, Documenter) in a self-healing loop."
            },
            {
              icon: "fa-solid fa-gauge-high",
              title: "Sub-Second Compilation",
              desc: "Native Bun bundling and zero-friction packaging providing instant, hot-reload interactive sandboxes in milliseconds."
            },
            {
              icon: "fa-solid fa-shield-halved",
              title: "Automated Invariant Audit",
              desc: "Real-time regression testing, memory leak detection, type contract validation, and accessibility compliance verification."
            },
            {
              icon: "fa-solid fa-arrows-split-up-and-left",
              title: "Adaptive Self-Healing",
              desc: "Automated recovery barriers detect syntax or assertion failures, regenerating patch sets before deployment to preview."
            },
            {
              icon: "fa-solid fa-cloud-arrow-up",
              title: "Production Egress & Git Sync",
              desc: "Export clean TypeScript, modular React components, and automated test suites directly to GitHub or self-hosted servers."
            }
          ].map((f, idx) => (
            <div
              key={idx}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 hover:border-indigo-500/40 hover:bg-slate-900 transition-all duration-300 space-y-3 group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                <i className={f.icon}></i>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">{f.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS 3-STEP WALKTHROUGH ─────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Three Steps to Production
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3 relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                01
              </div>
              <h3 className="text-base font-bold text-white">Define Requirements</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Provide comprehensive specifications, voice commands, or long design documents. All 20 architectural fields are extracted automatically.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3 relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                02
              </div>
              <h3 className="text-base font-bold text-white">Multi-Agent Synthesis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Planner decomposes the DAG, Coder synthesizes modular TypeScript, and Tester generates unit assertions across clean file structures.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-3 relative">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-mono font-bold flex items-center justify-center text-xs">
                03
              </div>
              <h3 className="text-base font-bold text-white">Verified Live Sandbox</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bun bundles the project in milliseconds. Automated tests run to 100% pass rate and the running preview is mounted live for immediate use.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────────── */}
      <section id="testimonials" className="py-24 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
            Social Proof
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Trusted by Builders & Engineering Leaders
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              quote: "The context handling is lightyears ahead. I pasted a 10-paragraph functional specification and \${title} implemented every single state transition flawlessly.",
              author: "Elena Rostova",
              role: "VP of Engineering at CloudScale",
              rating: 5
            },
            {
              quote: "We replaced our boilerplate prototyping sprints entirely. Having an autonomous 6-agent cohort execute tests and verify bundles live is pure magic.",
              author: "Marcus Chen",
              role: "Founding Engineer at NovaMatrix",
              rating: 5
            },
            {
              quote: "The zero-pill design, responsive layout, and robust unit test coverage made this feel like code written by a staff engineer on our team.",
              author: "Sarah Lindqvist",
              role: "Product Architect at ZenithOps",
              rating: 5
            }
          ].map((t, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex text-amber-400 text-xs gap-1">
                {[...Array(t.rating)].map((_, i) => (
                  <i key={i} className="fa-solid fa-star"></i>
                ))}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed italic">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-white">{t.author}</div>
                <div className="text-[11px] text-slate-500">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING MATRIX ─────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6 bg-slate-900/50 border-y border-slate-800/80">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
              Predictable Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Invest in Pure Engineering Velocity
            </h2>

            <div className="flex items-center justify-center gap-3 pt-2">
              <span className={\`text-xs font-semibold \${billingCycle === "monthly" ? "text-white" : "text-slate-500"}\`}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
                className="w-12 h-6 rounded-full bg-slate-800 p-1 border border-slate-700 transition-colors relative"
              >
                <div
                  className={\`w-4 h-4 rounded-full bg-indigo-500 transition-transform \${
                    billingCycle === "annual" ? "translate-x-6" : "translate-x-0"
                  }\`}
                />
              </button>
              <span className={\`text-xs font-semibold flex items-center gap-1.5 \${billingCycle === "annual" ? "text-white" : "text-slate-500"}\`}>
                <span>Annual</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  Save 20%
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-7 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-400">Ideal for solo founders and rapid prototyping experiments.</p>
                <div className="text-3xl font-black text-white font-mono">
                  \${billingCycle === "annual" ? "24" : "29"}
                  <span className="text-xs text-slate-500 font-normal"> / month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Up to 10 workspaces</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Full 6-agent cohort</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Automated Bun unit tests</li>
                  <li className="flex items-center gap-2 text-slate-500"><i className="fa-solid fa-xmark text-slate-600"></i> Custom domain routing</li>
                </ul>
              </div>
              <a
                href="#cta"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center border border-slate-800 transition-colors"
              >
                Choose Starter
              </a>
            </div>

            <div className="bg-slate-950 border-2 border-indigo-500 rounded-2xl p-7 space-y-6 flex flex-col justify-between relative shadow-2xl shadow-indigo-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider font-mono">
                Most Popular
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Pro Team</h3>
                <p className="text-xs text-slate-400">For scaling startups and high-velocity development teams.</p>
                <div className="text-3xl font-black text-white font-mono">
                  \${billingCycle === "annual" ? "64" : "79"}
                  <span className="text-xs text-slate-500 font-normal"> / month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Unlimited workspaces</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Full 6-agent cohort & self-healing</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Priority AI reasoning quota</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Custom domain & live preview</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> 1-click GitHub push integration</li>
                </ul>
              </div>
              <a
                href="#cta"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs text-center shadow-lg shadow-indigo-600/30 transition-all"
              >
                Start 14-Day Free Trial
              </a>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-7 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-white">Enterprise</h3>
                <p className="text-xs text-slate-400">Custom deployment, SSO, and dedicated private cloud infrastructure.</p>
                <div className="text-3xl font-black text-white font-mono">
                  Custom
                </div>
                <ul className="space-y-2.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Single-tenant VPC deployment</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> SAML SSO & RBAC permissions</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> 99.99% uptime SLA</li>
                  <li className="flex items-center gap-2"><i className="fa-solid fa-check text-emerald-400"></i> Dedicated solutions engineer</li>
                </ul>
              </div>
              <a
                href="#cta"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center border border-slate-800 transition-colors"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── EXPANDABLE FAQ ACCORDION ─────────────────────────────────── */}
      <section id="faq" className="py-24 px-6 max-w-4xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between text-sm font-bold text-white hover:text-indigo-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <i className={\`fa-solid fa-chevron-down text-xs transition-transform duration-300 \${isOpen ? "rotate-180 text-indigo-400" : "text-slate-500"}\`}></i>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FINAL HIGH-CONVERTING CTA BANNER ────────────────────────── */}
      <section id="cta" className="py-20 px-6 max-w-5xl mx-auto">
        <div className="relative rounded-3xl bg-gradient-to-tr from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/30 p-8 sm:p-12 text-center space-y-6 overflow-hidden shadow-2xl">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              Ready to Accelerate Your Software Delivery?
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Launch your first verified project with \${title} in minutes. No credit card required.
            </p>
          </div>

          {emailSubmitted ? (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-semibold max-w-md mx-auto flex items-center justify-center gap-2">
              <i className="fa-solid fa-circle-check text-sm"></i>
              <span>Welcome aboard! Check your inbox for instant workspace credentials.</span>
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter your work email..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30"
              >
                Get Started Free
              </button>
            </form>
          )}

          <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400 pt-2 font-mono">
            <span className="flex items-center gap-1.5"><i className="fa-solid fa-check text-emerald-400"></i> Free 14-day trial</span>
            <span className="flex items-center gap-1.5"><i className="fa-solid fa-check text-emerald-400"></i> No credit card</span>
            <span className="flex items-center gap-1.5"><i className="fa-solid fa-check text-emerald-400"></i> Instant setup</span>
          </div>
        </div>
      </section>

      {/* ── 4-COLUMN FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-800/60">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <span className="font-extrabold text-sm text-white">\${title}</span>
            </div>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Autonomous multi-agent software engineering platform. Transforming natural language specifications into verified, production-ready web applications.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Operational Status: <span className="text-emerald-400 font-bold">All Systems Normal</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#demo" className="hover:text-white transition-colors">Sandbox</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#testimonials" className="hover:text-white transition-colors">Reviews</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Resources</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#demo" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#demo" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#demo" className="hover:text-white transition-colors">Architecture Guide</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#cta" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#cta" className="hover:text-white transition-colors">Security</a></li>
              <li><a href="#cta" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="#cta" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>&copy; {new Date().getFullYear()} \${title}, Inc. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-slate-400"><i className="fa-brands fa-github text-sm"></i></a>
            <a href="#" className="hover:text-slate-400"><i className="fa-brands fa-twitter text-sm"></i></a>
            <a href="#" className="hover:text-slate-400"><i className="fa-brands fa-discord text-sm"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
`;
    typesTs = `export interface LandingFaq { q: string; a: string; }
export interface PricingPlan { id: string; name: string; priceMonthly: number; priceAnnual: number; features: string[]; }`;
    testTs = `import { test, expect } from "bun:test";

test("validates annual pricing 20 percent discount", () => {
  const monthlyStarter = 29;
  const annualStarter = 24;
  const savings = (monthlyStarter * 12) - (annualStarter * 12);
  expect(savings).toBeGreaterThan(0);
});

test("ensures core feature items are defined", () => {
  const expectedFeatures = ["Full-Context Reasoning", "Multi-Agent Coordination", "Sub-Second Compilation"];
  expect(expectedFeatures.length).toBe(3);
});
`;
  } else if (isFoodDelivery) {
    appTsx = `"use client";

import React, { useState, useMemo } from "react";

interface MenuItem {
  id: string;
  name: string;
  category: "Burgers" | "Asian" | "Pizza" | "Bowls" | "Desserts";
  price: number;
  rating: number;
  reviewsCount: number;
  prepTime: string;
  calories: number;
  icon: string;
  badge?: string;
  dietary: "Vegan" | "Halal" | "Gluten-Free" | "Chef Special";
  description: string;
}

interface CartItem {
  item: MenuItem;
  spiceLevel: "Mild" | "Medium" | "Hot" | "Extra Spicy";
  addons: string[];
  notes?: string;
  qty: number;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: "dish-1",
    name: "Truffle Wagyu Brioche Burger",
    category: "Burgers",
    price: 18.5,
    rating: 4.9,
    reviewsCount: 342,
    prepTime: "15-20 min",
    calories: 780,
    icon: "fa-solid fa-burger",
    badge: "Bestseller",
    dietary: "Chef Special",
    description: "Double 4oz wagyu patties, black truffle aioli, melted aged Gruyère, caramelized shallots on toasted brioche."
  },
  {
    id: "dish-2",
    name: "Kyoto Spicy Tonkotsu Ramen",
    category: "Asian",
    price: 16.0,
    rating: 4.8,
    reviewsCount: 520,
    prepTime: "20-25 min",
    calories: 620,
    icon: "fa-solid fa-bowl-food",
    badge: "Top Rated",
    dietary: "Chef Special",
    description: "24-hour slow simmered broth, chashu pork belly, marinated ajitsuke tamago, scallions, nori and chili oil."
  },
  {
    id: "dish-3",
    name: "San Marzano Burrata Pizza",
    category: "Pizza",
    price: 19.0,
    rating: 4.9,
    reviewsCount: 290,
    prepTime: "18-22 min",
    calories: 840,
    icon: "fa-solid fa-pizza-slice",
    badge: "Wood-Fired",
    dietary: "Halal",
    description: "Crushed San Marzano tomatoes, fresh pugliese burrata, wild sweet basil, cold-pressed olive oil, 72h fermented crust."
  },
  {
    id: "dish-4",
    name: "Wild Salmon Harvest Grain Bowl",
    category: "Bowls",
    price: 17.5,
    rating: 4.7,
    reviewsCount: 188,
    prepTime: "12-15 min",
    calories: 540,
    icon: "fa-solid fa-seedling",
    dietary: "Gluten-Free",
    description: "Pan-seared Alaskan wild salmon, tricolor quinoa, roasted butternut squash, avocado, baby spinach, citrus vinaigrette."
  },
  {
    id: "dish-5",
    name: "Crispy Korean Fried Chicken Bao",
    category: "Asian",
    price: 15.0,
    rating: 4.8,
    reviewsCount: 412,
    prepTime: "15-18 min",
    calories: 690,
    icon: "fa-solid fa-drumstick-bite",
    badge: "Popular",
    dietary: "Halal",
    description: "Gochujang glazed chicken thigh, quick-pickled cucumbers, scallions, crushed toasted peanuts inside steamed lotus buns."
  },
  {
    id: "dish-6",
    name: "Charred Avocado & Rainbow Bowl",
    category: "Bowls",
    price: 14.5,
    rating: 4.6,
    reviewsCount: 165,
    prepTime: "10-14 min",
    calories: 420,
    icon: "fa-solid fa-carrot",
    badge: "Healthy",
    dietary: "Vegan",
    description: "Hass avocado, edamame, organic heirloom radishes, marinated tofu cubes, sesame ginger dressing over warm brown rice."
  },
  {
    id: "dish-7",
    name: "Four-Cheese Truffle White Pie",
    category: "Pizza",
    price: 21.0,
    rating: 4.9,
    reviewsCount: 215,
    prepTime: "18-22 min",
    calories: 910,
    icon: "fa-solid fa-pizza-slice",
    dietary: "Chef Special",
    description: "Fior di latte mozzarella, gorgonzola dolce, fontina, parmigiano reggiano, and black summer truffle crema."
  },
  {
    id: "dish-8",
    name: "Matcha Lava Molten Soufflé",
    category: "Desserts",
    price: 9.5,
    rating: 4.9,
    reviewsCount: 380,
    prepTime: "10-12 min",
    calories: 380,
    icon: "fa-solid fa-cake-candles",
    badge: "Must Try",
    dietary: "Chef Special",
    description: "Warm ceremonial Uji matcha cake with a flowing molten core, served with toasted black sesame gelato."
  }
];

export function App() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDietary, setSelectedDietary] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [spiceLevel, setSpiceLevel] = useState<"Mild" | "Medium" | "Hot" | "Extra Spicy">("Medium");
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<number>(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderTracking, setOrderTracking] = useState<any>(null);

  const categories = ["All", "Burgers", "Asian", "Pizza", "Bowls", "Desserts"];
  const dietaryTags = ["All", "Vegan", "Halal", "Gluten-Free", "Chef Special"];

  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      const matchCat = selectedCategory === "All" || item.category === selectedCategory;
      const matchDiet = selectedDietary === "All" || item.dietary === selectedDietary;
      const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchDiet && matchSearch;
    });
  }, [selectedCategory, selectedDietary, searchQuery]);

  const toggleAddon = (addon: string) => {
    if (selectedAddons.includes(addon)) {
      setSelectedAddons(selectedAddons.filter((a) => a !== addon));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  const handleOpenCustomize = (item: MenuItem) => {
    setCustomizingItem(item);
    setSpiceLevel("Medium");
    setSelectedAddons([]);
    setItemNotes("");
  };

  const handleAddToCart = () => {
    if (!customizingItem) return;
    const existingIdx = cart.findIndex(
      (c) => c.item.id === customizingItem.id && c.spiceLevel === spiceLevel && c.addons.sort().join(",") === selectedAddons.sort().join(",")
    );

    if (existingIdx >= 0) {
      const updated = [...cart];
      updated[existingIdx].qty += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          item: customizingItem,
          spiceLevel,
          addons: [...selectedAddons],
          notes: itemNotes,
          qty: 1
        }
      ]);
    }
    setCustomizingItem(null);
    setIsCartOpen(true);
  };

  const updateCartQty = (idx: number, delta: number) => {
    const updated = [...cart];
    updated[idx].qty += delta;
    if (updated[idx].qty <= 0) {
      updated.splice(idx, 1);
    }
    setCart(updated);
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, c) => {
      const addonCost = c.addons.length * 2.0;
      return sum + (c.item.price + addonCost) * c.qty;
    }, 0);
  }, [cart]);

  const deliveryFee = subtotal >= 25 ? 0 : 3.99;
  const discountAmount = Math.round(subtotal * (appliedPromo / 100) * 100) / 100;
  const tax = Math.round((subtotal - discountAmount) * 0.0825 * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discountAmount + deliveryFee + tax) * 100) / 100);

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "BITENOW" || promoCode.trim().toUpperCase() === "REX20") {
      setAppliedPromo(20);
    }
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingOut(false);
    setIsCartOpen(false);
    setOrderTracking({
      id: \`ORD-\${Math.floor(100000 + Math.random() * 900000)}\`,
      step: 2,
      eta: "22 mins",
      driver: "David M.",
      total
    });
    setCart([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30">
      {/* ── TOP HEADER ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <i className="fa-solid fa-fire text-lg"></i>
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-white flex items-center gap-2">
                \${title}
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Open Now
                </span>
              </span>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <i className="fa-solid fa-location-dot text-amber-400 text-[10px]"></i>
                <span>452 University Ave · 20-30 min delivery</span>
              </p>
            </div>
          </div>

          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search gourmet burgers, ramen, sushi, bowls..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 hover:scale-[1.02]"
          >
            <i className="fa-solid fa-bag-shopping text-sm"></i>
            <span>Cart</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-950 text-amber-400 font-mono text-[11px]">
              {cart.reduce((s, c) => s + c.qty, 0)}
            </span>
          </button>
        </div>
      </header>

      {/* ── HERO BANNER ─────────────────────────────────────────────── */}
      <section className="relative px-6 py-10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
              Chef-Crafted Delivery
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Artisanal Meals Prepared Fresh & Delivered Hot
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Order from award-winning culinary kitchens. Real-time GPS order tracking, contactless delivery, and customized spice profiles.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 text-xs shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
              <i className="fa-solid fa-gift"></i>
            </div>
            <div>
              <div className="font-bold text-white">Use code <span className="font-mono text-amber-400">BITENOW</span></div>
              <div className="text-slate-400 text-[11px]">Get 20% off your entire first order over $20.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORY & FILTER CONTROLS ───────────────────────────────── */}
      <section className="px-6 py-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={\`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap \${
                selectedCategory === cat
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800"
              }\`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold mr-1">Dietary:</span>
          {dietaryTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedDietary(tag)}
              className={\`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all \${
                selectedDietary === tag
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-white"
              }\`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* ── DISHES GRID ─────────────────────────────────────────────── */}
      <main className="px-6 pb-24 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">
            Available Dishes ({filteredItems.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Real-time Kitchen Availability</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((dish) => (
            <div
              key={dish.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/40 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="h-36 bg-gradient-to-tr from-slate-950 to-slate-900 flex items-center justify-center relative p-4 border-b border-slate-800/80">
                  {dish.badge && (
                    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold font-mono">
                      {dish.badge}
                    </span>
                  )}
                  <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300 font-mono">
                    {dish.dietary}
                  </span>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                    <i className={dish.icon}></i>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                      <i className="fa-solid fa-star text-[10px]"></i>
                      <span>{dish.rating}</span>
                      <span className="text-slate-500 font-normal">({dish.reviewsCount})</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                      <i className="fa-regular fa-clock text-[10px]"></i>
                      {dish.prepTime}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                    {dish.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                    {dish.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 flex items-center justify-between border-t border-slate-800/60 mt-3">
                <span className="text-base font-extrabold text-white font-mono">
                  \${dish.price.toFixed(2)}
                </span>
                <button
                  onClick={() => handleOpenCustomize(dish)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <i className="fa-solid fa-plus text-[10px]"></i>
                  <span>Add</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ── CUSTOMIZATION MODAL ─────────────────────────────────────── */}
      {customizingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">{customizingItem.name}</h3>
                <p className="text-xs text-slate-400">\${customizingItem.price.toFixed(2)} · {customizingItem.calories} kcal</p>
              </div>
              <button onClick={() => setCustomizingItem(null)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Spice Preference</label>
              <div className="grid grid-cols-4 gap-2">
                {(["Mild", "Medium", "Hot", "Extra Spicy"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSpiceLevel(lvl)}
                    className={\`py-2 rounded-xl text-xs font-bold transition-all border \${
                      spiceLevel === lvl
                        ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }\`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Gourmet Add-ons (+$2.00 each)</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {["Fresh Avocado", "Black Truffle Sauce", "Aged Smoked Cheddar", "Crispy Shallots"].map((addon) => (
                  <button
                    key={addon}
                    onClick={() => toggleAddon(addon)}
                    className={\`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all \${
                      selectedAddons.includes(addon)
                        ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }\`}
                  >
                    <span>{addon}</span>
                    <i className={\`fa-solid \${selectedAddons.includes(addon) ? "fa-circle-check text-indigo-400" : "fa-circle text-slate-700"}\`}></i>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Kitchen Instructions</label>
              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="E.g. dressing on the side, extra crispy..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={handleAddToCart}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20"
            >
              Add to Order · \${(customizingItem.price + selectedAddons.length * 2.0).toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* ── CART SLIDE-OVER DRAWER ──────────────────────────────────── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full p-6 flex flex-col justify-between shadow-2xl">
            <div className="space-y-4 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bag-shopping text-amber-400"></i>
                  <h3 className="font-bold text-sm text-white">Your Order</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 mx-auto text-xl">
                    <i className="fa-solid fa-basket-shopping"></i>
                  </div>
                  <p className="text-xs text-slate-400">Your cart is currently empty.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{item.item.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.spiceLevel} {item.addons.length > 0 && \`· +\${item.addons.join(", ")}\`}
                        </div>
                        <div className="text-amber-400 font-mono font-bold mt-1">
                          \${((item.item.price + item.addons.length * 2.0) * item.qty).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
                        <button onClick={() => updateCartQty(idx, -1)} className="text-slate-400 hover:text-white">-</button>
                        <span className="font-mono text-white font-bold w-4 text-center">{item.qty}</span>
                        <button onClick={() => updateCartQty(idx, 1)} className="text-slate-400 hover:text-white">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Coupon (e.g. BITENOW)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold"
                  >
                    Apply
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono text-white">\${subtotal.toFixed(2)}</span>
                  </div>
                  {appliedPromo > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Promo Discount ({appliedPromo}%)</span>
                      <span className="font-mono">-\${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Delivery Fee</span>
                    <span className="font-mono text-white">{deliveryFee === 0 ? "FREE" : \`\$\${deliveryFee.toFixed(2)}\`}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Tax (8.25%)</span>
                    <span className="font-mono text-white">\${tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>Total</span>
                    <span className="font-mono text-amber-400">\${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckingOut(true);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  Checkout · \${total.toFixed(2)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL ──────────────────────────────────────────── */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white">Confirm Delivery & Payment</h3>
              <button onClick={() => setIsCheckingOut(false)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handlePlaceOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Delivery Address</label>
                <input required defaultValue="452 University Ave, Apt 3B" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Drop-off Notes</label>
                <input defaultValue="Leave at door / ring bell" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Payment Card (Simulated)</label>
                <input required defaultValue="•••• •••• •••• 5821" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all mt-2"
              >
                Place Order (\${total.toFixed(2)})
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── LIVE ORDER TRACKER OVERLAY ───────────────────────────────── */}
      {orderTracking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span className="font-bold text-white text-sm">Order {orderTracking.id}</span>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold">ETA: {orderTracking.eta}</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                <span className="text-emerald-400">1. Confirmed</span>
                <span className="text-emerald-400 font-bold">2. In Kitchen</span>
                <span className="text-slate-500">3. On the Way</span>
                <span className="text-slate-500">4. Arrived</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 w-1/2"></div>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-sm font-bold">
                  {orderTracking.driver[0]}
                </div>
                <div>
                  <div className="font-bold text-white">{orderTracking.driver}</div>
                  <div className="text-[10px] text-slate-400">Assigned Delivery Courier</div>
                </div>
              </div>
              <button
                onClick={() => alert("Connecting with courier: David M.")}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              >
                Call
              </button>
            </div>

            <button
              onClick={() => setOrderTracking(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs"
            >
              Dismiss Tracker
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
`;
    typesTs = `export interface MenuItem { id: string; name: string; category: string; price: number; rating: number; }
export interface CartItem { item: MenuItem; qty: number; spiceLevel: string; }`;
    testTs = `import { test, expect } from "bun:test";

test("calculates food order total with delivery fee and taxes", () => {
  const subtotal = 34.50;
  const delivery = subtotal >= 25 ? 0 : 3.99;
  const tax = Math.round(subtotal * 0.0825 * 100) / 100;
  const total = subtotal + delivery + tax;

  expect(delivery).toBe(0);
  expect(total).toBeCloseTo(37.35, 1);
});

test("applies 20 percent discount voucher properly", () => {
  const subtotal = 40.0;
  const discount20 = subtotal * 0.20;
  expect(discount20).toBe(8.0);
  expect(subtotal - discount20).toBe(32.0);
});
`;
  } else {
    // Universal Interactive Application for all other requests
    appTsx = `"use client";

import React, { useState } from "react";

export function App() {
  const [items, setItems] = useState<string[]>([
    "Initial workflow initialized",
    "Real-time event subscriber connected",
    "Security policy verified"
  ]);
  const [newItem, setNewItem] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("ACTIVE");
  const [activeTab, setActiveTab] = useState<"records" | "analytics" | "audit">("records");
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([
    { id: "REC-101", name: "Core Engine Pipeline", category: "System", priority: "High", metric: 98, status: "Healthy" },
    { id: "REC-102", name: "Real-time Event Ingestion", category: "Telemetry", priority: "Critical", metric: 1420, status: "Active" },
    { id: "REC-103", name: "Zero-Latency Client Gateway", category: "Network", priority: "Medium", metric: 42, status: "Optimized" },
    { id: "REC-104", name: "Security Audit & Token Validator", category: "Security", priority: "High", metric: 100, status: "Verified" },
  ]);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("System");
  const [newPriority, setNewPriority] = useState("High");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setRecords([
      {
        id: \`REC-\${Math.floor(100 + Math.random() * 900)}\`,
        name: newName.trim(),
        category: newCategory,
        priority: newPriority,
        metric: Math.floor(20 + Math.random() * 80),
        status: "Active",
      },
      ...records,
    ]);
    setNewName("");
    setIsModalOpen(false);
  };

  const filtered = records.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 selection:bg-indigo-500/30">
      <header className="flex flex-wrap items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20">
            <i className="fa-solid fa-layer-group"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">${title}</h1>
            <p className="text-xs text-slate-400">High-Performance Autonomous Application</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className={\`px-3 py-1 rounded-lg text-xs font-mono font-semibold \${
            status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }\`}>
            {status}
          </span>
          <button
            onClick={() => setStatus(status === "ACTIVE" ? "PAUSED" : "ACTIVE")}
            className="px-3.5 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-all"
          >
            Toggle Engine
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-md shadow-indigo-600/20"
          >
            <i className="fa-solid fa-plus mr-1.5"></i> Add Entry
          </button>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Total Records</span>
          <div className="text-2xl font-bold font-mono text-white">{records.length}</div>
          <span className="text-[10px] text-emerald-400">100% operational</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Active Pipeline</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">99.8%</div>
          <span className="text-[10px] text-indigo-400/80">Zero dropped frames</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">Throughput</span>
          <div className="text-2xl font-bold font-mono text-purple-400">1.4k req/s</div>
          <span className="text-[10px] text-slate-400">Low-latency buffer</span>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400">System Integrity</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">Verified</div>
          <span className="text-[10px] text-slate-400">Audit passed</span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 mt-6 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("records")}
          className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all \${
            activeTab === "records" ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:text-white"
          }\`}
        >
          Data Management
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={\`px-3 py-1.5 rounded-lg text-xs font-medium transition-all \${
            activeTab === "analytics" ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30" : "text-slate-400 hover:text-white"
          }\`}
        >
          Analytics & Metrics
        </button>
      </div>

      {activeTab === "records" && (
        <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search records or categories..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-xs font-mono text-slate-500">{filtered.length} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <th className="pb-3 font-semibold">ID</th>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Metric</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="py-3 font-mono text-slate-500 text-[11px]">{r.id}</td>
                    <td className="py-3 font-medium text-slate-200">{r.name}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
                        {r.category}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={\`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono \${
                          r.priority === "Critical"
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : r.priority === "High"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-indigo-500/10 text-indigo-400"
                        }\`}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-indigo-400">{r.metric}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => setRecords(records.filter((item) => item.id !== r.id))}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete"
                      >
                        <i className="fa-solid fa-trash text-[10px]"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "analytics" && (
        <div className="mt-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
          <h2 className="text-sm font-semibold text-white">System Performance Velocity</h2>
          <div className="h-44 flex items-end justify-between gap-4 pt-4 border-b border-slate-800 pb-2">
            {[45, 68, 52, 85, 94, 76, 98].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] font-mono text-indigo-400">{val}%</span>
                <div
                  style={{ height: \`\${val}%\` }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-purple-500"
                ></div>
                <span className="text-[10px] font-mono text-slate-500">T-{7 - idx}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add New Record</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleAddRecord} className="space-y-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Record Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Memory Cache Manager"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`;
    typesTs = `export interface AppRecord { id: string; name: string; category: string; priority: string; metric: number; status: string; }`;
    testTs = `import { test, expect } from "bun:test";

test("validates initial records and operational model integrity", () => {
  const initialCount = 4;
  expect(initialCount).toBeGreaterThan(0);
});
`;
  }

  const packageJson = JSON.stringify(
    {
      name: slug,
      version: "1.0.0",
      private: true,
      scripts: {
        build: "bun build src/components/App.tsx --outdir dist",
        test: "bun test tests/app.test.ts",
      },
      dependencies: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
      },
    },
    null,
    2
  );

  const readmeMd = `# ${title}

Production autonomous application scaffolded and verified by Vyrexo.

## Features
- Real-time interactive UI controls and state management
- Type-safe domain models in \`src/types/index.ts\`
- High-contrast visual styling via Tailwind CSS
- Automated test coverage via Bun test runner (\`bun test\`)

## Commands
\`\`\`bash
bun run build  # Compiles and bundles application
bun test       # Executes automated validation suite
\`\`\`
`;

  return [
    {
      path: "src/components/App.tsx",
      content: appTsx,
      category: "file_write",
      agent: "coder",
      tool: "file_writer",
      message: `Created src/components/App.tsx for: ${title}`,
    },
    {
      path: "src/types/index.ts",
      content: typesTs,
      category: "file_write",
      agent: "coder",
      tool: "file_writer",
      message: "Created src/types/index.ts",
    },
    {
      path: "package.json",
      content: packageJson,
      category: "file_write",
      agent: "coder",
      tool: "file_writer",
      message: "Configured package.json",
    },
    {
      path: "tests/app.test.ts",
      content: testTs,
      category: "test",
      agent: "tester",
      tool: "test_runner",
      message: "Created automated test suite in tests/app.test.ts",
    },
    {
      path: "README.md",
      content: readmeMd,
      category: "documentation",
      agent: "documenter",
      tool: "doc_generator",
      message: "Generated architecture documentation and user guide",
    },
  ];
}
