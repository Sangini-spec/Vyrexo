export interface FlightRoute {
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
