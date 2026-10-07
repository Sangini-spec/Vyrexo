/**
 * OmniCalc Pro — Robust Math, Financial & Conversion Engine
 * Handles expression tokenization, operator precedence (BODMAS), floating-point
 * rounding, trigonometry (DEG/RAD), loan amortization (EMI), and unit conversions.
 */

export interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  principal: number;
  interestRatio: number;
  amortizationPreview: Array<{
    month: number;
    principalPaid: number;
    interestPaid: number;
    remainingBalance: number;
  }>;
}

export type UnitCategory = "length" | "mass" | "temperature" | "digital";

const LENGTH_TO_METERS: Record<string, number> = {
  m: 1,
  km: 1000,
  cm: 0.01,
  mm: 0.001,
  mi: 1609.344,
  yd: 0.9144,
  ft: 0.3048,
  in: 0.0254,
};

const MASS_TO_KG: Record<string, number> = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  lb: 0.45359237,
  oz: 0.028349523,
  ton: 1000,
};

const DIGITAL_TO_BYTES: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

/**
 * Clean floating point inaccuracies (e.g. 0.1 + 0.2 = 0.30000000000000004 -> 0.3)
 */
export function formatPrecision(val: number, maxDecimals: number = 10): string {
  if (isNaN(val)) return "Error: NaN";
  if (!isFinite(val)) return val > 0 ? "Error: Infinity" : "Error: -Infinity";
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(val * factor) / factor;
  return rounded.toString();
}

/**
 * Factorial calculation with bounds check
 */
export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) throw new Error("Factorial requires non-negative integer");
  if (n > 170) return Infinity; // JS Number overflow
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

/**
 * Evaluates mathematical expression securely with order of operations
 */
export function evaluateExpression(expr: string, isDegreeMode: boolean = false): { result: number; error?: string } {
  try {
    let clean = expr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/π/g, Math.PI.toString())
      .replace(/\be\b/g, Math.E.toString())
      .trim();

    if (!clean) return { result: 0 };

    // Disallow dangerous JS keywords
    if (/[a-zA-Z_$]/.test(clean.replace(/\b(Math|sin|cos|tan|asin|acos|atan|sqrt|log|ln|abs|PI|E|pow)\b/g, ""))) {
      return { result: 0, error: "Invalid expression characters" };
    }

    // Function wrappers for trigonometry
    const degToRad = (deg: number) => (deg * Math.PI) / 180;
    const radToDeg = (rad: number) => (rad * 180) / Math.PI;

    const context = {
      sin: (x: number) => Math.sin(isDegreeMode ? degToRad(x) : x),
      cos: (x: number) => Math.cos(isDegreeMode ? degToRad(x) : x),
      tan: (x: number) => Math.tan(isDegreeMode ? degToRad(x) : x),
      asin: (x: number) => (isDegreeMode ? radToDeg(Math.asin(x)) : Math.asin(x)),
      acos: (x: number) => (isDegreeMode ? radToDeg(Math.acos(x)) : Math.acos(x)),
      atan: (x: number) => (isDegreeMode ? radToDeg(Math.atan(x)) : Math.atan(x)),
      sqrt: (x: number) => {
        if (x < 0) throw new Error("Square root of negative number");
        return Math.sqrt(x);
      },
      log: (x: number) => Math.log10(x),
      ln: (x: number) => Math.log(x),
      abs: (x: number) => Math.abs(x),
      pow: (x: number, y: number) => Math.pow(x, y),
    };

    // Replace ^ with ** for exponents
    clean = clean.replace(/(\d+(\.\d+)?)\s*\^\s*(\d+(\.\d+)?)/g, "Math.pow($1,$3)");

    const fn = new Function("ctx", `with(ctx) { return (${clean}); }`);
    const val = fn(context);

    if (typeof val !== "number" || isNaN(val)) {
      return { result: 0, error: "Mathematical Error" };
    }

    if (!isFinite(val)) {
      return { result: 0, error: "Division by zero" };
    }

    return { result: val };
  } catch (err: any) {
    return { result: 0, error: err.message || "Syntax Error" };
  }
}

/**
 * Computes standard Loan Equated Monthly Installment (EMI) and amortization schedule
 */
export function calculateLoanEMI(
  principal: number,
  annualRatePct: number,
  tenureMonths: number
): LoanResult {
  if (principal <= 0 || tenureMonths <= 0) {
    return {
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      principal: 0,
      interestRatio: 0,
      amortizationPreview: [],
    };
  }

  const monthlyRate = annualRatePct > 0 ? annualRatePct / 12 / 100 : 0;

  let monthlyPayment = 0;
  if (monthlyRate === 0) {
    monthlyPayment = principal / tenureMonths;
  } else {
    monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  }

  const totalPayment = monthlyPayment * tenureMonths;
  const totalInterest = totalPayment - principal;
  const interestRatio = (totalInterest / totalPayment) * 100;

  // Generate first 6 months amortization preview
  const amortizationPreview: LoanResult["amortizationPreview"] = [];
  let balance = principal;
  const sampleMonths = Math.min(6, tenureMonths);

  for (let m = 1; m <= sampleMonths; m++) {
    const interestPart = balance * monthlyRate;
    const principalPart = monthlyPayment - interestPart;
    balance = Math.max(0, balance - principalPart);

    amortizationPreview.push({
      month: m,
      principalPaid: Math.round(principalPart * 100) / 100,
      interestPaid: Math.round(interestPart * 100) / 100,
      remainingBalance: Math.round(balance * 100) / 100,
    });
  }

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    totalPayment: Math.round(totalPayment * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    principal,
    interestRatio: Math.round(interestRatio * 10) / 10,
    amortizationPreview,
  };
}

/**
 * Converts physical units across supported dimensions
 */
export function convertUnits(
  val: number,
  fromUnit: string,
  toUnit: string,
  category: UnitCategory
): number {
  if (fromUnit === toUnit) return val;

  if (category === "temperature") {
    // Convert to Celsius base first
    let c = val;
    if (fromUnit === "F") c = ((val - 32) * 5) / 9;
    else if (fromUnit === "K") c = val - 273.15;

    // Convert Celsius to target
    if (toUnit === "C") return c;
    if (toUnit === "F") return (c * 9) / 5 + 32;
    if (toUnit === "K") return c + 273.15;
    return val;
  }

  if (category === "length") {
    const fromFactor = LENGTH_TO_METERS[fromUnit] ?? 1;
    const toFactor = LENGTH_TO_METERS[toUnit] ?? 1;
    const inMeters = val * fromFactor;
    return inMeters / toFactor;
  }

  if (category === "mass") {
    const fromFactor = MASS_TO_KG[fromUnit] ?? 1;
    const toFactor = MASS_TO_KG[toUnit] ?? 1;
    const inKg = val * fromFactor;
    return inKg / toFactor;
  }

  if (category === "digital") {
    const fromFactor = DIGITAL_TO_BYTES[fromUnit] ?? 1;
    const toFactor = DIGITAL_TO_BYTES[toUnit] ?? 1;
    const inBytes = val * fromFactor;
    return inBytes / toFactor;
  }

  return val;
}
