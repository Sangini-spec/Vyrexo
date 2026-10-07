"use client";

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
            <h1 className="text-xl font-bold text-white tracking-tight">SkyWings Flight Booking & Air Travel System</h1>
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
                <span className="text-emerald-400 font-bold">${totalPrice} USD</span>
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
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 border-indigo-500 shadow-xl shadow-indigo-500/10"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                  }`}
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
                        <div className="text-lg font-bold font-mono text-white">${Math.round(flight.price * classMultiplier)}</div>
                        <div className="text-[10px] text-slate-500">per traveler</div>
                      </div>
                      <button
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-300"
                        }`}
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
                  className={`py-2 rounded-lg border transition-all ${
                    selectedSeat === seat
                      ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
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
                <span>${Math.round(basePrice * classMultiplier)}</span>
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
                <span className="text-emerald-400">${totalPrice} USD</span>
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
