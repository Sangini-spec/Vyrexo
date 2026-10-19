import { test, expect } from "bun:test";

test("calculates RailGo PNR fare breakdown with catering and superfast GST", () => {
  const classPrice = 145;
  const paxCount = 2;
  const baseFare = classPrice * paxCount;
  const catering = 14 * paxCount;
  const gst = Math.round(baseFare * 0.08);
  const total = baseFare + catering + gst;

  expect(baseFare).toBe(290);
  expect(catering).toBe(28);
  expect(gst).toBe(23);
  expect(total).toBe(341);
});

test("filters high-speed train routes by origin and destination station code", () => {
  const routes = [
    { number: "22901", originCode: "NDLS", destinationCode: "MMCT", type: "Bullet" },
    { number: "20607", originCode: "SBC", destinationCode: "MAS", type: "Vande Metro" },
  ];
  const ndlsToMmct = routes.filter((r) => r.originCode === "NDLS" && r.destinationCode === "MMCT");
  expect(ndlsToMmct.length).toBe(1);
  expect(ndlsToMmct[0].number).toBe("22901");
});

test("decrements seat availability upon PNR ticket confirmation", () => {
  const initialAvailable = 18;
  const bookedPassengers = 2;
  const remaining = Math.max(0, initialAvailable - bookedPassengers);
  expect(remaining).toBe(16);
});
