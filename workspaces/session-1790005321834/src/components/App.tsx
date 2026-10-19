"use client";

import React, { useState, useMemo } from "react";

interface TrainClassInfo {
  code: "1A" | "2A" | "3A" | "CC" | "EC";
  name: string;
  price: number;
  available: number;
  status: "AVAILABLE" | "RAC" | "WL";
}

interface TrainRoute {
  id: string;
  number: string;
  name: string;
  type: "Bullet" | "Express" | "Vande Metro" | "Intercity";
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  distanceKm: number;
  platform: number;
  onTimeRating: number;
  amenities: string[];
  classes: TrainClassInfo[];
  stops: Array<{ station: string; code: string; arr: string; dep: string; platform: number }>;
}

interface Passenger {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  berthPref: "Lower" | "Upper" | "Window" | "Aisle" | "No Preference";
  mealPref: "Veg Standard" | "Continental" | "Jain" | "No Meal";
  seatCode: string;
}

interface PnrBooking {
  pnr: string;
  trainNumber: string;
  trainName: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  departureTime: string;
  arrivalTime: string;
  journeyDate: string;
  travelClass: string;
  coach: string;
  passengers: Passenger[];
  baseFare: number;
  cateringCharge: number;
  dynamicSurge: number;
  totalAmount: number;
  status: "CONFIRMED" | "CANCELLED";
  bookedAt: string;
  platform: number;
}

const STATIONS = [
  { code: "NDLS", name: "New Delhi Central" },
  { code: "MMCT", name: "Mumbai Central" },
  { code: "SBC", name: "Bengaluru City Jn" },
  { code: "MAS", name: "Chennai Central" },
  { code: "HWH", name: "Howrah Junction" },
  { code: "HYB", name: "Hyderabad Deccan" },
  { code: "PUNE", name: "Pune Junction" },
  { code: "ADI", name: "Ahmedabad Jn" },
];

const INITIAL_TRAINS: TrainRoute[] = [
  {
    id: "TR-101",
    number: "22901",
    name: "RailGo Shinkansen Bullet",
    type: "Bullet",
    origin: "New Delhi Central",
    originCode: "NDLS",
    destination: "Mumbai Central",
    destinationCode: "MMCT",
    departureTime: "06:00",
    arrivalTime: "11:45",
    duration: "5h 45m",
    distanceKm: 1384,
    platform: 1,
    onTimeRating: 99.4,
    amenities: ["Wi-Fi 6E", "Gourmet Dining", "EV Power", "Panoramic Windows", "Quiet Coach"],
    classes: [
      { code: "EC", name: "Executive First (EC)", price: 145, available: 18, status: "AVAILABLE" },
      { code: "1A", name: "First AC Sleeper (1A)", price: 118, available: 12, status: "AVAILABLE" },
      { code: "CC", name: "AC Chair Car (CC)", price: 68, available: 44, status: "AVAILABLE" },
    ],
    stops: [
      { station: "New Delhi Central", code: "NDLS", arr: "Start", dep: "06:00", platform: 1 },
      { station: "Kota Junction", code: "KOTA", arr: "07:50", dep: "07:53", platform: 2 },
      { station: "Vadodara Jn", code: "BRC", arr: "09:55", dep: "09:58", platform: 4 },
      { station: "Surat HSR", code: "ST", arr: "10:42", dep: "10:45", platform: 1 },
      { station: "Mumbai Central", code: "MMCT", arr: "11:45", dep: "End", platform: 3 },
    ],
  },
  {
    id: "TR-102",
    number: "12952",
    name: "Tejas Rajdhani Superfast",
    type: "Express",
    origin: "New Delhi Central",
    originCode: "NDLS",
    destination: "Mumbai Central",
    destinationCode: "MMCT",
    departureTime: "16:55",
    arrivalTime: "08:35",
    duration: "15h 40m",
    distanceKm: 1384,
    platform: 3,
    onTimeRating: 96.8,
    amenities: ["Complimentary Meals", "Bedding Suite", "Reading Lamps", "Bio-Vacuum Lounge"],
    classes: [
      { code: "1A", name: "First AC Coupe (1A)", price: 96, available: 8, status: "AVAILABLE" },
      { code: "2A", name: "AC 2-Tier (2A)", price: 62, available: 26, status: "AVAILABLE" },
      { code: "3A", name: "AC 3-Tier (3A)", price: 42, available: 64, status: "AVAILABLE" },
    ],
    stops: [
      { station: "New Delhi Central", code: "NDLS", arr: "Start", dep: "16:55", platform: 3 },
      { station: "Kota Junction", code: "KOTA", arr: "21:30", dep: "21:40", platform: 1 },
      { station: "Ratlam Jn", code: "RTM", arr: "00:25", dep: "00:28", platform: 4 },
      { station: "Surat HSR", code: "ST", arr: "05:18", dep: "05:23", platform: 2 },
      { station: "Mumbai Central", code: "MMCT", arr: "08:35", dep: "End", platform: 5 },
    ],
  },
  {
    id: "TR-103",
    number: "20607",
    name: "Vande Metro Deccan Liner",
    type: "Vande Metro",
    origin: "Bengaluru City Jn",
    originCode: "SBC",
    destination: "Chennai Central",
    destinationCode: "MAS",
    departureTime: "07:15",
    arrivalTime: "11:05",
    duration: "3h 50m",
    distanceKm: 362,
    platform: 5,
    onTimeRating: 98.9,
    amenities: ["180° Rotating Seats", "Onboard Infotainment", "Auto Sliding Doors", "Espresso Bar"],
    classes: [
      { code: "EC", name: "Executive Vista (EC)", price: 54, available: 22, status: "AVAILABLE" },
      { code: "CC", name: "AC Chair Car (CC)", price: 29, available: 78, status: "AVAILABLE" },
    ],
    stops: [
      { station: "Bengaluru City Jn", code: "SBC", arr: "Start", dep: "07:15", platform: 5 },
      { station: "Krishnarajapuram", code: "KJM", arr: "07:28", dep: "07:30", platform: 2 },
      { station: "Katpadi Jn", code: "KPD", arr: "09:35", dep: "09:37", platform: 1 },
      { station: "Chennai Central", code: "MAS", arr: "11:05", dep: "End", platform: 4 },
    ],
  },
  {
    id: "TR-104",
    number: "12262",
    name: "Duronto Non-Stop Sovereign",
    type: "Intercity",
    origin: "Mumbai Central",
    originCode: "MMCT",
    destination: "Pune Junction",
    destinationCode: "PUNE",
    departureTime: "14:20",
    arrivalTime: "17:05",
    duration: "2h 45m",
    distanceKm: 192,
    platform: 2,
    onTimeRating: 97.5,
    amenities: ["Ghat Panorama Glass", "Wi-Fi", "Snack Trolley", "Laptop Outlets"],
    classes: [
      { code: "EC", name: "Vista Dome Executive (EC)", price: 46, available: 15, status: "AVAILABLE" },
      { code: "2A", name: "AC 2-Tier (2A)", price: 32, available: 30, status: "AVAILABLE" },
      { code: "CC", name: "AC Chair Car (CC)", price: 19, available: 52, status: "AVAILABLE" },
    ],
    stops: [
      { station: "Mumbai Central", code: "MMCT", arr: "Start", dep: "14:20", platform: 2 },
      { station: "Lonavala", code: "LNL", arr: "15:58", dep: "16:00", platform: 1 },
      { station: "Pune Junction", code: "PUNE", arr: "17:05", dep: "End", platform: 3 },
    ],
  },
];

const COACH_SEATS = [
  "1W", "2M", "3A", "4A", "5M", "6W",
  "7W", "8M", "9A", "10A", "11M", "12W",
  "13W", "14M", "15A", "16A", "17M", "18W",
  "19W", "20M", "21A", "22A", "23M", "24W",
];

export function App() {
  const [activeTab, setActiveTab] = useState<"search" | "seatmap" | "bookings" | "live_radar">("search");
  const [originFilter, setOriginFilter] = useState<string>("ALL");
  const [destFilter, setDestFilter] = useState<string>("ALL");
  const [journeyDate, setJourneyDate] = useState<string>("2026-10-24");
  const [trainTypeFilter, setTrainTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [trains, setTrains] = useState<TrainRoute[]>(INITIAL_TRAINS);
  const [selectedTrainId, setSelectedTrainId] = useState<string>("TR-101");
  const [selectedClassCode, setSelectedClassCode] = useState<"1A" | "2A" | "3A" | "CC" | "EC">("EC");
  const [selectedCoach, setSelectedCoach] = useState<string>("C1");
  const [selectedSeats, setSelectedSeats] = useState<string[]>(["7W", "8M"]);
  const [occupiedSeats] = useState<string[]>(["1W", "4A", "12W", "15A", "19W"]);

  const [passengers, setPassengers] = useState<Passenger[]>([
    { id: "P-1", name: "Aarav Sharma", age: 29, gender: "Male", berthPref: "Window", mealPref: "Continental", seatCode: "C1-7W" },
    { id: "P-2", name: "Meera Nair", age: 27, gender: "Female", berthPref: "Window", mealPref: "Veg Standard", seatCode: "C1-8M" },
  ]);
  const [newPaxName, setNewPaxName] = useState("");
  const [newPaxAge, setNewPaxAge] = useState("26");
  const [newPaxGender, setNewPaxGender] = useState<"Male" | "Female" | "Other">("Male");
  const [newPaxMeal, setNewPaxMeal] = useState<Passenger["mealPref"]>("Veg Standard");

  const [pnrSearchInput, setPnrSearchInput] = useState("");
  const [scheduleModalTrain, setScheduleModalTrain] = useState<TrainRoute | null>(null);
  const [bookingBanner, setBookingBanner] = useState<string | null>(null);

  const [bookings, setBookings] = useState<PnrBooking[]>([
    {
      pnr: "PNR-8492017",
      trainNumber: "22901",
      trainName: "RailGo Shinkansen Bullet",
      origin: "New Delhi Central",
      originCode: "NDLS",
      destination: "Mumbai Central",
      destinationCode: "MMCT",
      departureTime: "06:00",
      arrivalTime: "11:45",
      journeyDate: "2026-10-22",
      travelClass: "Executive First (EC)",
      coach: "E1",
      passengers: [
        { id: "P-90", name: "Rohan Verma", age: 34, gender: "Male", berthPref: "Window", mealPref: "Continental", seatCode: "E1-4W" },
      ],
      baseFare: 145,
      cateringCharge: 18,
      dynamicSurge: 12,
      totalAmount: 175,
      status: "CONFIRMED",
      bookedAt: "2026-10-18 09:15",
      platform: 1,
    },
  ]);

  const selectedTrain = useMemo(
    () => trains.find((t) => t.id === selectedTrainId) || trains[0],
    [trains, selectedTrainId]
  );

  const selectedClassInfo = useMemo(
    () =>
      selectedTrain.classes.find((c) => c.code === selectedClassCode) ||
      selectedTrain.classes[0],
    [selectedTrain, selectedClassCode]
  );

  const filteredTrains = useMemo(() => {
    return trains.filter((t) => {
      const matchOrigin = originFilter === "ALL" || t.originCode === originFilter;
      const matchDest = destFilter === "ALL" || t.destinationCode === destFilter;
      const matchType = trainTypeFilter === "ALL" || t.type === trainTypeFilter;
      const matchQuery =
        !searchQuery.trim() ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.number.includes(searchQuery) ||
        t.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.destination.toLowerCase().includes(searchQuery.toLowerCase());
      return matchOrigin && matchDest && matchType && matchQuery;
    });
  }, [trains, originFilter, destFilter, trainTypeFilter, searchQuery]);

  const fareBreakdown = useMemo(() => {
    const count = Math.max(1, passengers.length);
    const baseFare = selectedClassInfo.price * count;
    const cateringCharge = passengers.reduce(
      (sum, p) => sum + (p.mealPref === "No Meal" ? 0 : 14),
      0
    );
    const gstAndSuperfast = Math.round(baseFare * 0.08);
    return {
      count,
      baseFare,
      cateringCharge,
      gstAndSuperfast,
      total: baseFare + cateringCharge + gstAndSuperfast,
    };
  }, [passengers, selectedClassInfo]);

  const handleSwapStations = () => {
    const prevO = originFilter;
    setOriginFilter(destFilter);
    setDestFilter(prevO);
  };

  const handleToggleSeat = (seat: string) => {
    if (occupiedSeats.includes(seat)) return;
    setSelectedSeats((prev) =>
      prev.includes(seat) ? prev.filter((s) => s !== seat) : [...prev, seat]
    );
  };

  const handleAddPassenger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaxName.trim()) return;
    const nextSeat = selectedSeats[passengers.length] || `${passengers.length + 9}W`;
    const newP: Passenger = {
      id: `P-${Date.now()}`,
      name: newPaxName.trim(),
      age: Math.max(1, Math.min(110, parseInt(newPaxAge, 10) || 25)),
      gender: newPaxGender,
      berthPref: nextSeat.endsWith("W") ? "Window" : "Aisle",
      mealPref: newPaxMeal,
      seatCode: `${selectedCoach}-${nextSeat}`,
    };
    setPassengers((prev) => [...prev, newP]);
    setNewPaxName("");
  };

  const handleRemovePassenger = (id: string) => {
    if (passengers.length <= 1) return;
    setPassengers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConfirmBooking = () => {
    const newPnr = `PNR-${Math.floor(1000000 + Math.random() * 8999999)}`;
    const syncedPassengers = passengers.map((p, idx) => ({
      ...p,
      seatCode: `${selectedCoach}-${selectedSeats[idx] || `${idx + 5}W`}`,
    }));

    const newTicket: PnrBooking = {
      pnr: newPnr,
      trainNumber: selectedTrain.number,
      trainName: selectedTrain.name,
      origin: selectedTrain.origin,
      originCode: selectedTrain.originCode,
      destination: selectedTrain.destination,
      destinationCode: selectedTrain.destinationCode,
      departureTime: selectedTrain.departureTime,
      arrivalTime: selectedTrain.arrivalTime,
      journeyDate,
      travelClass: selectedClassInfo.name,
      coach: selectedCoach,
      passengers: syncedPassengers,
      baseFare: fareBreakdown.baseFare,
      cateringCharge: fareBreakdown.cateringCharge,
      dynamicSurge: fareBreakdown.gstAndSuperfast,
      totalAmount: fareBreakdown.total,
      status: "CONFIRMED",
      bookedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      platform: selectedTrain.platform,
    };

    setBookings((prev) => [newTicket, ...prev]);
    setTrains((prev) =>
      prev.map((tr) =>
        tr.id !== selectedTrain.id
          ? tr
          : {
              ...tr,
              classes: tr.classes.map((c) =>
                c.code !== selectedClassInfo.code
                  ? c
                  : { ...c, available: Math.max(0, c.available - syncedPassengers.length) }
              ),
            }
      )
    );
    setBookingBanner(`Ticket Confirmed! PNR ${newPnr} issued for ${selectedTrain.name} (${syncedPassengers.length} pax).`);
    setActiveTab("bookings");
  };

  const handleCancelBooking = (pnr: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.pnr === pnr ? { ...b, status: "CANCELLED" } : b))
    );
  };

  const filteredBookings = useMemo(() => {
    if (!pnrSearchInput.trim()) return bookings;
    return bookings.filter(
      (b) =>
        b.pnr.toLowerCase().includes(pnrSearchInput.toLowerCase()) ||
        b.trainName.toLowerCase().includes(pnrSearchInput.toLowerCase()) ||
        b.trainNumber.includes(pnrSearchInput)
    );
  }, [bookings, pnrSearchInput]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans antialiased flex flex-col">
      {/* Top Railway Command Bar */}
      <header className="sticky top-0 z-40 bg-[#0b1120]/95 backdrop-blur-md border-b border-slate-800/80 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <i className="fa-solid fa-train-subway text-lg"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">RailGo — High-Speed Train & Railway Booking Platform</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  CRIS / HSR Live Grid
                </span>
              </div>
              <p className="text-xs text-slate-400">
                High-Speed Rail Reservation, Interactive Coach Seat Map & Instant PNR Ticketing
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            {[
              { id: "search", label: "Find Trains", icon: "fa-magnifying-glass" },
              { id: "seatmap", label: "Coach & Seat Map", icon: "fa-chair" },
              { id: "bookings", label: `My PNR Tickets (${bookings.filter((b) => b.status === "CONFIRMED").length})`, icon: "fa-ticket" },
              { id: "live_radar", label: "Live Train Radar", icon: "fa-satellite-dish" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <i className={`fa-solid ${tab.icon} text-[11px]`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {bookingBanner && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-emerald-300">
            <span className="flex items-center gap-2 font-medium">
              <i className="fa-solid fa-circle-check text-emerald-400"></i>
              {bookingBanner}
            </span>
            <button onClick={() => setBookingBanner(null)} className="text-emerald-400 hover:text-white">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Search & Corridor Filter Bar */}
        <section className="bg-[#0d1526] border border-slate-800/90 rounded-2xl p-5 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Origin Station
              </label>
              <select
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Corridors (Any Origin)</option>
                {STATIONS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1 flex justify-center">
              <button
                type="button"
                onClick={handleSwapStations}
                title="Swap Origin & Destination"
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-400 flex items-center justify-center transition-all"
              >
                <i className="fa-solid fa-right-left text-xs"></i>
              </button>
            </div>

            <div className="md:col-span-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Destination Station
              </label>
              <select
                value={destFilter}
                onChange={(e) => setDestFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Corridors (Any Destination)</option>
                {STATIONS.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Journey Date
              </label>
              <input
                type="date"
                value={journeyDate}
                onChange={(e) => setJourneyDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Train Name / Number Filter
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 22901, Bullet, Vande..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-8 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Fleet Tier:</span>
              {["ALL", "Bullet", "Vande Metro", "Express", "Intercity"].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTrainTypeFilter(tier)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    trainTypeFilter === tier
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {tier === "ALL" ? "All Trains" : tier}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Showing <span className="text-cyan-400 font-bold">{filteredTrains.length}</span> active services on {journeyDate}
            </div>
          </div>
        </section>

        {/* TAB 1: TRAIN SEARCH & INSTANT RESERVATION */}
        {activeTab === "search" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
              {filteredTrains.map((train) => {
                const isSelected = train.id === selectedTrain.id;
                return (
                  <div
                    key={train.id}
                    className={`rounded-2xl border p-5 transition-all ${
                      isSelected
                        ? "bg-[#0f1b33] border-cyan-500/60 shadow-lg shadow-cyan-500/10"
                        : "bg-[#0d1526] border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-800/80">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                            #{train.number}
                          </span>
                          <h2 className="text-base font-bold text-white">{train.name}</h2>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            {train.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {train.amenities.map((am) => (
                            <span
                              key={am}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800"
                            >
                              {am}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          <i className="fa-solid fa-bolt mr-1"></i>
                          {train.onTimeRating}% On-Time
                        </span>
                        <button
                          onClick={() => setScheduleModalTrain(train)}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px]"
                        >
                          Route & Stops ({train.stops.length})
                        </button>
                      </div>
                    </div>

                    {/* Timing Bar */}
                    <div className="grid grid-cols-3 items-center py-4">
                      <div>
                        <div className="text-xl font-black font-mono text-white">{train.departureTime}</div>
                        <div className="text-xs font-semibold text-cyan-400">{train.originCode}</div>
                        <div className="text-[11px] text-slate-400">{train.origin}</div>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-mono text-slate-400">{train.duration} • {train.distanceKm} km</span>
                        <div className="w-full max-w-[160px] h-0.5 bg-slate-800 my-1.5 relative flex items-center justify-between">
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                          <i className="fa-solid fa-train text-cyan-400 text-xs"></i>
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        </div>
                        <span className="text-[10px] text-slate-500">Platform #{train.platform}</span>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-black font-mono text-white">{train.arrivalTime}</div>
                        <div className="text-xs font-semibold text-blue-400">{train.destinationCode}</div>
                        <div className="text-[11px] text-slate-400">{train.destination}</div>
                      </div>
                    </div>

                    {/* Class Selector Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                      {train.classes.map((cls) => {
                        const activeCls = isSelected && selectedClassInfo.code === cls.code;
                        return (
                          <button
                            key={cls.code}
                            onClick={() => {
                              setSelectedTrainId(train.id);
                              setSelectedClassCode(cls.code);
                            }}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              activeCls
                                ? "bg-cyan-500/15 border-cyan-400 ring-1 ring-cyan-400/40"
                                : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{cls.name}</span>
                              <span className="text-sm font-black font-mono text-cyan-400">${cls.price}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                                AVAILABLE • {cls.available} seats
                              </span>
                              <span className="text-[10px] text-slate-400">Select →</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Live Reservation & Passenger Manifest */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 sticky top-20">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">
                      Instant PNR Reservation
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedTrain.name}</h3>
                    <p className="text-[11px] text-slate-400">
                      {selectedTrain.originCode} → {selectedTrain.destinationCode} • {selectedClassInfo.name}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab("seatmap")}
                    className="px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-semibold hover:bg-cyan-500/25"
                  >
                    Coach Seat Map
                  </button>
                </div>

                {/* Passenger List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Passengers ({passengers.length})</span>
                    <span className="font-mono text-[11px] text-cyan-400">Coach {selectedCoach}</span>
                  </div>
                  {passengers.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {idx + 1}. {p.name} <span className="text-slate-400 font-normal">({p.age}y, {p.gender})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Seat <span className="text-cyan-400 font-mono font-semibold">{selectedCoach}-{selectedSeats[idx] || `${idx + 5}W`}</span> • {p.mealPref}
                        </div>
                      </div>
                      {passengers.length > 1 && (
                        <button
                          onClick={() => handleRemovePassenger(p.id)}
                          className="text-slate-500 hover:text-red-400 px-1.5"
                        >
                          <i className="fa-solid fa-trash-can text-[11px]"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Passenger Form */}
                <form onSubmit={handleAddPassenger} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5">
                  <div className="text-[11px] font-semibold text-slate-300">Add Co-Passenger</div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newPaxName}
                      onChange={(e) => setNewPaxName(e.target.value)}
                      placeholder="Full name..."
                      className="col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="number"
                      value={newPaxAge}
                      onChange={(e) => setNewPaxAge(e.target.value)}
                      placeholder="Age"
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newPaxGender}
                      onChange={(e) => setNewPaxGender(e.target.value as any)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                    <select
                      value={newPaxMeal}
                      onChange={(e) => setNewPaxMeal(e.target.value as any)}
                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value="Veg Standard">Veg Meal (+$14)</option>
                      <option value="Continental">Continental (+$14)</option>
                      <option value="Jain">Jain Meal (+$14)</option>
                      <option value="No Meal">No Meal ($0)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 transition-all"
                  >
                    + Add Passenger to PNR
                  </button>
                </form>

                {/* Fare Summary */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Rail Fare ({fareBreakdown.count} pax)</span>
                    <span className="font-mono text-white">${fareBreakdown.baseFare}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Onboard Catering & Lounge</span>
                    <span className="font-mono text-white">${fareBreakdown.cateringCharge}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Superfast Charge & Rail GST</span>
                    <span className="font-mono text-white">${fareBreakdown.gstAndSuperfast}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>Total Payable</span>
                    <span className="font-mono text-cyan-400">${fareBreakdown.total}</span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmBooking}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  Confirm & Issue PNR Ticket (${fareBreakdown.total})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTERACTIVE COACH & SEAT MAP */}
        {activeTab === "seatmap" && (
          <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Interactive Coach Layout — {selectedTrain.name} (#{selectedTrain.number})
                </h2>
                <p className="text-xs text-slate-400">
                  Select coach and preferred Window (W), Middle (M), or Aisle (A) seats
                </p>
              </div>
              <div className="flex items-center gap-2">
                {["C1", "C2", "E1", "B1", "A1"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCoach(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                      selectedCoach === c
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    Coach {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 max-w-3xl mx-auto p-6 rounded-2xl bg-slate-950 border border-slate-800">
              {COACH_SEATS.map((seat) => {
                const isOccupied = occupiedSeats.includes(seat);
                const isChosen = selectedSeats.includes(seat);
                return (
                  <button
                    key={seat}
                    disabled={isOccupied}
                    onClick={() => handleToggleSeat(seat)}
                    className={`p-3 rounded-xl font-mono text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      isOccupied
                        ? "bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed"
                        : isChosen
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20"
                        : "bg-[#0d1526] border-slate-800 text-slate-300 hover:border-cyan-500/40"
                    }`}
                  >
                    <i className="fa-solid fa-chair text-[11px]"></i>
                    <span>{selectedCoach}-{seat}</span>
                    <span className="text-[9px] font-normal text-slate-400">
                      {seat.endsWith("W") ? "Window" : seat.endsWith("A") ? "Aisle" : "Middle"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between max-w-3xl mx-auto pt-2">
              <div className="text-xs text-slate-400">
                Selected Seats:{" "}
                <span className="font-mono text-cyan-400 font-bold">
                  {selectedSeats.map((s) => `${selectedCoach}-${s}`).join(", ") || "None"}
                </span>
              </div>
              <button
                onClick={() => setActiveTab("search")}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Save Seat Selection & Return to Booking
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: MY PNR TICKETS & REFUND MANAGER */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d1526] border border-slate-800 rounded-2xl p-4">
              <div>
                <h2 className="text-sm font-bold text-white">Issued PNR E-Tickets & Reservation Ledger</h2>
                <p className="text-xs text-slate-400">Verify PNR status, coach/berth assignments, or claim instant cancellation refund</p>
              </div>
              <input
                type="text"
                value={pnrSearchInput}
                onChange={(e) => setPnrSearchInput(e.target.value)}
                placeholder="Search by PNR or train..."
                className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 w-64"
              />
            </div>

            {filteredBookings.map((b) => (
              <div
                key={b.pnr}
                className="bg-[#0d1526] border border-slate-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                      {b.pnr}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {b.trainName} (#{b.trainNumber})
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Journey Date: {b.journeyDate} • {b.travelClass} • Platform #{b.platform}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
                        b.status === "CONFIRMED"
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/15 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {b.status === "CONFIRMED" ? "CNF / CONFIRMED" : "CANCELLED (REFUNDED)"}
                    </span>
                    {b.status === "CONFIRMED" && (
                      <button
                        onClick={() => handleCancelBooking(b.pnr)}
                        className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/25 text-xs"
                      >
                        Cancel Ticket
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[10px] uppercase">Route & Schedule</div>
                    <div className="font-bold text-white mt-1">
                      {b.origin} ({b.originCode}) → {b.destination} ({b.destinationCode})
                    </div>
                    <div className="text-cyan-400 font-mono mt-0.5">
                      Dep {b.departureTime} • Arr {b.arrivalTime}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-slate-400 text-[10px] uppercase">Passenger Manifest</div>
                    <div className="space-y-1 mt-1">
                      {b.passengers.map((p) => (
                        <div key={p.id} className="flex justify-between text-slate-200">
                          <span>{p.name} ({p.age}y)</span>
                          <span className="font-mono text-cyan-400 font-bold">{p.seatCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div className="flex justify-between text-slate-400">
                      <span>Total Paid</span>
                      <span className="text-sm font-black font-mono text-emerald-400">${b.totalAmount}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">
                      Booked at {b.bookedAt} • E-Ticket QR Verified
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: LIVE TRAIN RADAR & GPS TELEMETRY */}
        {activeTab === "live_radar" && (
          <div className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Live National Train Radar & Delay Telemetry</h2>
                <p className="text-xs text-slate-400">Real-time locomotive GPS speed, next halt ETA, and track clearance status</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                4 Active Consists Tracked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trains.map((t, i) => (
                <div key={t.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-cyan-400 font-bold">#{t.number}</span>
                      <h3 className="text-sm font-bold text-white">{t.name}</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400">
                      {t.type === "Bullet" ? "285 km/h" : "132 km/h"} • ON TIME
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Next Halt: <span className="text-white font-semibold">{t.stops[1]?.station || t.destination}</span> (Platform #{t.stops[1]?.platform || t.platform})
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                      style={{ width: `${62 + i * 8}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Route Schedule Modal */}
      {scheduleModalTrain && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setScheduleModalTrain(null)}
        >
          <div
            className="bg-[#0d1526] border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {scheduleModalTrain.name} (#{scheduleModalTrain.number}) — Station Stops
                </h3>
                <p className="text-xs text-slate-400">
                  {scheduleModalTrain.origin} to {scheduleModalTrain.destination} ({scheduleModalTrain.distanceKm} km)
                </p>
              </div>
              <button onClick={() => setScheduleModalTrain(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {scheduleModalTrain.stops.map((st, idx) => (
                <div
                  key={st.code}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono text-cyan-400 font-bold mr-2">{idx + 1}.</span>
                    <span className="font-semibold text-white">{st.station}</span>
                    <span className="text-slate-500 font-mono ml-1.5">({st.code})</span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-300">
                    Arr: {st.arr} • Dep: {st.dep} • PF #{st.platform}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default App;
