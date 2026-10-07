import { test, expect } from "bun:test";
import {
  evaluateExpression,
  formatPrecision,
  factorial,
  calculateLoanEMI,
  convertUnits,
} from "../src/utils/mathEngine";

test("Arithmetic Precedence (BODMAS)", () => {
  const res1 = evaluateExpression("2 + 3 * 4");
  expect(res1.result).toBe(14);

  const res2 = evaluateExpression("(2 + 3) * 4");
  expect(res2.result).toBe(20);

  const res3 = evaluateExpression("10 - 6 / 2 + 1");
  expect(res3.result).toBe(8);
});

test("Precision Formatter eliminates floating point noise", () => {
  const noisy = 0.1 + 0.2;
  expect(formatPrecision(noisy)).toBe("0.3");
});

test("Factorial boundaries and correctness", () => {
  expect(factorial(0)).toBe(1);
  expect(factorial(1)).toBe(1);
  expect(factorial(5)).toBe(120);
  expect(factorial(7)).toBe(5040);
  expect(() => factorial(-3)).toThrow();
});

test("Scientific Trigonometry (Degree & Radian)", () => {
  const degSin = evaluateExpression("sin(90)", true);
  expect(Math.round(degSin.result)).toBe(1);

  const radSin = evaluateExpression("sin(3.141592653589793 / 2)", false);
  expect(Math.round(radSin.result)).toBe(1);
});

test("Financial Loan EMI Calculation", () => {
  // Principal: $200,000, 6% annual rate, 30 years (360 months)
  const loan = calculateLoanEMI(200000, 6, 360);
  expect(loan.monthlyPayment).toBeGreaterThan(1190);
  expect(loan.monthlyPayment).toBeLessThan(1210);
  expect(loan.totalPayment).toBeGreaterThan(200000);
  expect(loan.amortizationPreview.length).toBe(6);
});

test("Unit Converter Invariants", () => {
  // 1 meter to feet
  const ft = convertUnits(1, "m", "ft", "length");
  expect(Math.round(ft * 100) / 100).toBe(3.28);

  // 100 C to Fahrenheit
  const f = convertUnits(100, "C", "F", "temperature");
  expect(f).toBe(212);

  // 1 GB to MB
  const mb = convertUnits(1, "GB", "MB", "digital");
  expect(mb).toBe(1024);
});

test("Division by zero safeguards", () => {
  const res = evaluateExpression("10 / 0");
  expect(res.error).toBeDefined();
});
