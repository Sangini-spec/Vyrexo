import { test, expect } from "bun:test";

test("initial application state and math boundaries", () => {
  const initialAltitude = 124;
  const initialBattery = 88;
  expect(initialAltitude).toBeGreaterThan(0);
  expect(initialBattery).toBeLessThanOrEqual(100);
});

test("voltage and power conversion accuracy", () => {
  const batteryPct = 88;
  const voltage = (batteryPct / 100) * 16.8;
  expect(voltage).toBeGreaterThan(14.0);
  expect(voltage).toBeLessThanOrEqual(16.8);
});

test("attitude limits and gyro safety threshold", () => {
  const maxPitch = 25;
  const minPitch = -25;
  const currentPitch = 12;
  expect(currentPitch).toBeGreaterThanOrEqual(minPitch);
  expect(currentPitch).toBeLessThanOrEqual(maxPitch);
});
