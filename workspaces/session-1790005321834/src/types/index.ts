export interface TrainClassInfo {
  code: "1A" | "2A" | "3A" | "CC" | "EC";
  name: string;
  price: number;
  available: number;
  status: "AVAILABLE" | "RAC" | "WL";
}

export interface TrainRoute {
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
}

export interface Passenger {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  berthPref: string;
  mealPref: string;
  seatCode: string;
}

export interface PnrBooking {
  pnr: string;
  trainNumber: string;
  trainName: string;
  origin: string;
  destination: string;
  journeyDate: string;
  travelClass: string;
  coach: string;
  passengers: Passenger[];
  totalAmount: number;
  status: "CONFIRMED" | "CANCELLED";
}
