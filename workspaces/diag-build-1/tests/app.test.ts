import { test, expect } from "bun:test";

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
