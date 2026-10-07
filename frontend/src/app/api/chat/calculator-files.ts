export const CALCULATOR_MATH_ENGINE_TS = `/**
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
      .replace(/\\be\\b/g, Math.E.toString())
      .trim();

    if (!clean) return { result: 0 };

    // Disallow dangerous JS keywords
    if (/[a-zA-Z_$]/.test(clean.replace(/\\b(Math|sin|cos|tan|asin|acos|atan|sqrt|log|ln|abs|PI|E|pow)\\b/g, ""))) {
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
    clean = clean.replace(/(\\d+(\\.\\d+)?)\\s*\\^\\s*(\\d+(\\.\\d+)?)/g, "Math.pow($1,$3)");

    const fn = new Function("ctx", \`with(ctx) { return (\${clean}); }\`);
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
`;

export const CALCULATOR_TYPES_TS = `export type CalculatorMode = "standard" | "scientific" | "financial" | "converter";

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: string;
  mode: CalculatorMode;
}

export interface MemoryState {
  value: number;
  hasValue: boolean;
}

export interface UnitOption {
  label: string;
  symbol: string;
}
`;

export const CALCULATOR_APP_TSX = `"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  formatPrecision,
  factorial,
  evaluateExpression,
  calculateLoanEMI,
  convertUnits,
  LoanResult,
  UnitCategory,
} from "../utils/mathEngine";
import { CalculatorMode, HistoryItem } from "../types/calculator";

export const Calculator: React.FC = () => {
  const [mode, setMode] = useState<CalculatorMode>("standard");
  const [display, setDisplay] = useState<string>("0");
  const [expression, setExpression] = useState<string>("");
  const [memory, setMemory] = useState<number>(0);
  const [hasMemory, setHasMemory] = useState<boolean>(false);
  const [isDegreeMode, setIsDegreeMode] = useState<boolean>(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [resetNext, setResetNext] = useState<boolean>(false);

  // Financial Loan States
  const [principal, setPrincipal] = useState<number>(250000);
  const [annualRate, setAnnualRate] = useState<number>(6.5);
  const [tenureYears, setTenureYears] = useState<number>(30);
  const [loanResult, setLoanResult] = useState<LoanResult | null>(null);

  // Converter States
  const [convCategory, setConvCategory] = useState<UnitCategory>("length");
  const [convInput, setConvInput] = useState<string>("100");
  const [fromUnit, setFromUnit] = useState<string>("m");
  const [toUnit, setToUnit] = useState<string>("ft");
  const [convOutput, setConvOutput] = useState<string>("");

  // Recalculate loan on parameters change
  useEffect(() => {
    const res = calculateLoanEMI(principal, annualRate, tenureYears * 12);
    setLoanResult(res);
  }, [principal, annualRate, tenureYears]);

  // Recalculate unit conversion
  useEffect(() => {
    const num = parseFloat(convInput);
    if (!isNaN(num)) {
      const converted = convertUnits(num, fromUnit, toUnit, convCategory);
      setConvOutput(formatPrecision(converted, 6));
    } else {
      setConvOutput("");
    }
  }, [convInput, fromUnit, toUnit, convCategory]);

  const handleInputDigit = useCallback((d: string) => {
    setDisplay((prev) => {
      if (resetNext || prev === "0") {
        setResetNext(false);
        return d;
      }
      return prev.length < 16 ? prev + d : prev;
    });
  }, [resetNext]);

  const handleInputDot = useCallback(() => {
    setDisplay((prev) => {
      if (resetNext) {
        setResetNext(false);
        return "0.";
      }
      if (!prev.includes(".")) {
        return prev + ".";
      }
      return prev;
    });
  }, [resetNext]);

  const handleOperator = useCallback((op: string) => {
    setResetNext(true);
    setExpression((prev) => {
      if (prev && !resetNext) {
        return \`\${prev} \${display} \${op}\`;
      }
      return \`\${display} \${op}\`;
    });
  }, [display, resetNext]);

  const handleClear = useCallback(() => {
    setDisplay("0");
    setExpression("");
    setResetNext(false);
  }, []);

  const handleDelete = useCallback(() => {
    if (resetNext) return;
    setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
  }, [resetNext]);

  const handleToggleSign = useCallback(() => {
    setDisplay((prev) => {
      if (prev === "0") return prev;
      return prev.startsWith("-") ? prev.slice(1) : "-" + prev;
    });
  }, []);

  const handleEquals = useCallback(() => {
    const fullExpr = expression ? \`\${expression} \${display}\` : display;
    const evalRes = evaluateExpression(fullExpr, isDegreeMode);

    if (evalRes.error) {
      setDisplay(evalRes.error);
      setResetNext(true);
      return;
    }

    const formatted = formatPrecision(evalRes.result);
    const newEntry: HistoryItem = {
      id: "h-" + Date.now(),
      expression: fullExpr,
      result: formatted,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      mode,
    };

    setHistory((prev) => [newEntry, ...prev.slice(0, 24)]);
    setDisplay(formatted);
    setExpression("");
    setResetNext(true);
  }, [expression, display, isDegreeMode, mode]);

  const handleScientificOp = useCallback((op: string) => {
    const curVal = parseFloat(display);
    if (isNaN(curVal)) return;

    try {
      let res = 0;
      let exprLabel = "";
      switch (op) {
        case "sin":
          res = isDegreeMode ? Math.sin((curVal * Math.PI) / 180) : Math.sin(curVal);
          exprLabel = \`sin(\${curVal})\`;
          break;
        case "cos":
          res = isDegreeMode ? Math.cos((curVal * Math.PI) / 180) : Math.cos(curVal);
          exprLabel = \`cos(\${curVal})\`;
          break;
        case "tan":
          res = isDegreeMode ? Math.tan((curVal * Math.PI) / 180) : Math.tan(curVal);
          exprLabel = \`tan(\${curVal})\`;
          break;
        case "sqrt":
          if (curVal < 0) throw new Error("Invalid Input");
          res = Math.sqrt(curVal);
          exprLabel = \`√(\${curVal})\`;
          break;
        case "sqr":
          res = curVal * curVal;
          exprLabel = \`(\${curVal})²\`;
          break;
        case "log":
          if (curVal <= 0) throw new Error("Invalid Input");
          res = Math.log10(curVal);
          exprLabel = \`log(\${curVal})\`;
          break;
        case "ln":
          if (curVal <= 0) throw new Error("Invalid Input");
          res = Math.log(curVal);
          exprLabel = \`ln(\${curVal})\`;
          break;
        case "1/x":
          if (curVal === 0) throw new Error("Divide by Zero");
          res = 1 / curVal;
          exprLabel = \`1/(\${curVal})\`;
          break;
        case "fact":
          res = factorial(Math.floor(curVal));
          exprLabel = \`\${curVal}!\`;
          break;
        case "pi":
          res = Math.PI;
          exprLabel = "π";
          break;
        case "e":
          res = Math.E;
          exprLabel = "e";
          break;
        default:
          return;
      }

      const formatted = formatPrecision(res);
      setHistory((prev) => [
        {
          id: "sci-" + Date.now(),
          expression: exprLabel,
          result: formatted,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          mode: "scientific",
        },
        ...prev.slice(0, 24),
      ]);
      setDisplay(formatted);
      setResetNext(true);
    } catch (err: any) {
      setDisplay(err.message || "Error");
      setResetNext(true);
    }
  }, [display, isDegreeMode]);

  // Memory operations
  const handleMemory = useCallback((op: "MC" | "MR" | "M+" | "M-" | "MS") => {
    const curVal = parseFloat(display) || 0;
    switch (op) {
      case "MC":
        setMemory(0);
        setHasMemory(false);
        break;
      case "MR":
        setDisplay(formatPrecision(memory));
        setResetNext(true);
        break;
      case "M+":
        setMemory((prev) => prev + curVal);
        setHasMemory(true);
        setResetNext(true);
        break;
      case "M-":
        setMemory((prev) => prev - curVal);
        setHasMemory(true);
        setResetNext(true);
        break;
      case "MS":
        setMemory(curVal);
        setHasMemory(true);
        setResetNext(true);
        break;
    }
  }, [display, memory]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (mode !== "standard" && mode !== "scientific") return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key >= "0" && e.key <= "9") handleInputDigit(e.key);
      else if (e.key === ".") handleInputDot();
      else if (e.key === "+") handleOperator("+");
      else if (e.key === "-") handleOperator("-");
      else if (e.key === "*") handleOperator("×");
      else if (e.key === "/") {
        e.preventDefault();
        handleOperator("÷");
      }
      else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      }
      else if (e.key === "Backspace") handleDelete();
      else if (e.key === "Escape") handleClear();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleInputDigit, handleInputDot, handleOperator, handleEquals, handleDelete, handleClear, mode]);

  const copyResult = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 antialiased selection:bg-indigo-600/30">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800/90 rounded-3xl p-5 shadow-2xl shadow-black/60 relative overflow-hidden backdrop-blur-md">
        {/* Header Ribbon */}
        <header className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <i className="fa-solid fa-calculator text-sm"></i>
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide flex items-center gap-2">
                OmniCalc Pro
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] rounded-full font-mono font-medium">v2.4</span>
              </h1>
              <p className="text-[11px] text-slate-400">Scientific, Financial & Precision Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={\`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all \${
                showHistory
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white"
              }\`}
              title="Toggle Calculation History"
            >
              <i className="fa-solid fa-clock-rotate-left text-[11px]"></i>
              <span className="hidden sm:inline">History</span>
              {history.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-400 text-slate-950 text-[9px] font-bold flex items-center justify-center ml-0.5">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Mode Selector Tabs */}
        <nav className="grid grid-cols-4 gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl mb-4 text-xs font-semibold">
          {(["standard", "scientific", "financial", "converter"] as CalculatorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={\`py-2 rounded-xl transition-all capitalize text-[11px] sm:text-xs flex items-center justify-center gap-1.5 \${
                mode === m
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }\`}
            >
              {m === "standard" && <i className="fa-solid fa-calculator text-[10px]"></i>}
              {m === "scientific" && <i className="fa-solid fa-atom text-[10px]"></i>}
              {m === "financial" && <i className="fa-solid fa-chart-line text-[10px]"></i>}
              {m === "converter" && <i className="fa-solid fa-right-left text-[10px]"></i>}
              {m}
            </button>
          ))}
        </nav>

        {/* Standard & Scientific Display */}
        {(mode === "standard" || mode === "scientific") && (
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-4 shadow-inner relative group">
            {/* Status tags */}
            <div className="flex items-center justify-between text-[11px] font-mono mb-1 text-slate-500">
              <div className="flex items-center gap-2">
                {mode === "scientific" && (
                  <button
                    onClick={() => setIsDegreeMode(!isDegreeMode)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    {isDegreeMode ? "DEG" : "RAD"}
                  </button>
                )}
                {hasMemory && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                    M
                  </span>
                )}
              </div>
              <div className="h-4 truncate text-slate-400 overflow-hidden text-right font-mono">
                {expression || "\\u00A0"}
              </div>
            </div>

            {/* Main Result Display */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={copyResult}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all text-xs"
                title="Copy result"
              >
                <i className={\`fa-solid \${copied ? "fa-check text-emerald-400" : "fa-copy"}\`}></i>
              </button>
              <div className="flex-1 text-right text-3xl sm:text-4xl font-mono font-black text-white tracking-wider truncate">
                {display}
              </div>
            </div>
          </div>
        )}

        {/* Memory Ribbon */}
        {(mode === "standard" || mode === "scientific") && (
          <div className="grid grid-cols-5 gap-1.5 mb-3 text-xs font-mono font-semibold">
            <button onClick={() => handleMemory("MC")} disabled={!hasMemory} className="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all">MC</button>
            <button onClick={() => handleMemory("MR")} disabled={!hasMemory} className="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all">MR</button>
            <button onClick={() => handleMemory("M+")} className="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition-all">M+</button>
            <button onClick={() => handleMemory("M-")} className="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-indigo-400 hover:text-indigo-300 transition-all">M-</button>
            <button onClick={() => handleMemory("MS")} className="py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-400 hover:text-white transition-all">MS</button>
          </div>
        )}

        {/* MODE: STANDARD KEYPAD */}
        {mode === "standard" && (
          <div className="grid grid-cols-4 gap-2">
            <button onClick={handleClear} className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-rose-400 font-bold text-sm transition-all shadow-sm">AC</button>
            <button onClick={handleDelete} className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-slate-300 font-bold text-sm transition-all shadow-sm"><i className="fa-solid fa-delete-left"></i></button>
            <button onClick={() => handleOperator("%")} className="p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 text-indigo-400 font-bold text-sm transition-all shadow-sm">%</button>
            <button onClick={() => handleOperator("÷")} className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-indigo-600/20">÷</button>

            <button onClick={() => handleInputDigit("7")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">7</button>
            <button onClick={() => handleInputDigit("8")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">8</button>
            <button onClick={() => handleInputDigit("9")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">9</button>
            <button onClick={() => handleOperator("×")} className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-indigo-600/20">×</button>

            <button onClick={() => handleInputDigit("4")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">4</button>
            <button onClick={() => handleInputDigit("5")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">5</button>
            <button onClick={() => handleInputDigit("6")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">6</button>
            <button onClick={() => handleOperator("-")} className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-indigo-600/20">−</button>

            <button onClick={() => handleInputDigit("1")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">1</button>
            <button onClick={() => handleInputDigit("2")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">2</button>
            <button onClick={() => handleInputDigit("3")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">3</button>
            <button onClick={() => handleOperator("+")} className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all shadow-md shadow-indigo-600/20">+</button>

            <button onClick={handleToggleSign} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-slate-300 font-semibold text-sm transition-all">±</button>
            <button onClick={() => handleInputDigit("0")} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">0</button>
            <button onClick={handleInputDot} className="p-3.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800/80 text-white font-semibold text-base transition-all">.</button>
            <button onClick={handleEquals} className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg transition-all shadow-md shadow-emerald-600/25">=</button>
          </div>
        )}

        {/* MODE: SCIENTIFIC KEYPAD */}
        {mode === "scientific" && (
          <div className="space-y-2">
            {/* Scientific Function Grid */}
            <div className="grid grid-cols-5 gap-1.5 text-xs font-mono">
              <button onClick={() => handleScientificOp("sin")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">sin</button>
              <button onClick={() => handleScientificOp("cos")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">cos</button>
              <button onClick={() => handleScientificOp("tan")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">tan</button>
              <button onClick={() => handleScientificOp("sqrt")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">√x</button>
              <button onClick={() => handleScientificOp("sqr")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">x²</button>

              <button onClick={() => handleScientificOp("ln")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">ln</button>
              <button onClick={() => handleScientificOp("log")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">log₁₀</button>
              <button onClick={() => handleOperator("^")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">xʸ</button>
              <button onClick={() => handleScientificOp("1/x")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">1/x</button>
              <button onClick={() => handleScientificOp("fact")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-indigo-300 font-semibold transition-all">n!</button>

              <button onClick={() => handleScientificOp("pi")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-amber-400 font-semibold transition-all">π</button>
              <button onClick={() => handleScientificOp("e")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-amber-400 font-semibold transition-all">e</button>
              <button onClick={() => handleOperator("(")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 font-semibold transition-all">(</button>
              <button onClick={() => handleOperator(")")} className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 font-semibold transition-all">)</button>
              <button onClick={handleClear} className="p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 font-bold transition-all">AC</button>
            </div>

            {/* Standard Number Matrix Below */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <button onClick={() => handleInputDigit("7")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">7</button>
              <button onClick={() => handleInputDigit("8")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">8</button>
              <button onClick={() => handleInputDigit("9")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">9</button>
              <button onClick={() => handleOperator("÷")} className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all">÷</button>

              <button onClick={() => handleInputDigit("4")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">4</button>
              <button onClick={() => handleInputDigit("5")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">5</button>
              <button onClick={() => handleInputDigit("6")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">6</button>
              <button onClick={() => handleOperator("×")} className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all">×</button>

              <button onClick={() => handleInputDigit("1")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">1</button>
              <button onClick={() => handleInputDigit("2")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">2</button>
              <button onClick={() => handleInputDigit("3")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">3</button>
              <button onClick={() => handleOperator("-")} className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base transition-all">−</button>

              <button onClick={() => handleInputDigit("0")} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">0</button>
              <button onClick={handleInputDot} className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-semibold text-base transition-all">.</button>
              <button onClick={handleDelete} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"><i className="fa-solid fa-delete-left"></i></button>
              <button onClick={handleEquals} className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg transition-all shadow-md shadow-emerald-600/25">=</button>
            </div>
          </div>
        )}

        {/* MODE: FINANCIAL LOAN & EMI CALCULATOR */}
        {mode === "financial" && loanResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                <div className="text-[11px] text-slate-400 font-medium">Monthly Payment (EMI)</div>
                <div className="text-xl font-black text-emerald-400 font-mono mt-1">
                  \${loanResult.monthlyPayment.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                <div className="text-[11px] text-slate-400 font-medium">Total Interest</div>
                <div className="text-xl font-black text-amber-400 font-mono mt-1">
                  \${loanResult.totalInterest.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                <div className="text-[11px] text-slate-400 font-medium">Total Loan Cost</div>
                <div className="text-xl font-black text-indigo-400 font-mono mt-1">
                  \${loanResult.totalPayment.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Visual ratio bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Principal (\${principal.toLocaleString()})</span>
                <span>Interest ({loanResult.interestRatio}%)</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
                <div style={{ width: \`\${100 - loanResult.interestRatio}%\` }} className="bg-indigo-600 h-full"></div>
                <div style={{ width: \`\${loanResult.interestRatio}%\` }} className="bg-amber-500 h-full"></div>
              </div>
            </div>

            {/* Sliders & Inputs */}
            <div className="space-y-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Loan Principal</span>
                  <span className="font-mono text-white">\${principal.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="1000000"
                  step="5000"
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Annual Interest Rate</span>
                  <span className="font-mono text-white">{annualRate}%</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="0.1"
                  value={annualRate}
                  onChange={(e) => setAnnualRate(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Tenure (Years)</span>
                  <span className="font-mono text-white">{tenureYears} Years ({tenureYears * 12} mo)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Amortization schedule mini-preview */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-3">
              <div className="text-xs font-bold text-slate-300 mb-2">Amortization Schedule (Initial Months)</div>
              <div className="overflow-x-auto text-[11px] font-mono">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-800 pb-1">
                      <th className="pb-1">Mo</th>
                      <th className="pb-1">Principal</th>
                      <th className="pb-1">Interest</th>
                      <th className="pb-1">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {loanResult.amortizationPreview.map((row) => (
                      <tr key={row.month}>
                        <td className="py-1 text-slate-400">#{row.month}</td>
                        <td className="py-1 text-indigo-400">\${row.principalPaid.toLocaleString()}</td>
                        <td className="py-1 text-amber-400">\${row.interestPaid.toLocaleString()}</td>
                        <td className="py-1">\${row.remainingBalance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODE: UNIT CONVERTER */}
        {mode === "converter" && (
          <div className="space-y-4">
            {/* Category selection */}
            <div className="grid grid-cols-4 gap-2 text-xs font-semibold">
              {(["length", "mass", "temperature", "digital"] as UnitCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setConvCategory(cat);
                    if (cat === "length") { setFromUnit("m"); setToUnit("ft"); }
                    else if (cat === "mass") { setFromUnit("kg"); setToUnit("lb"); }
                    else if (cat === "temperature") { setFromUnit("C"); setToUnit("F"); }
                    else if (cat === "digital") { setFromUnit("MB"); setToUnit("GB"); }
                  }}
                  className={\`py-2 rounded-xl capitalize transition-all \${
                    convCategory === cat
                      ? "bg-indigo-600 text-white font-bold"
                      : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                  }\`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Conversion card */}
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">From Value & Unit</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={convInput}
                    onChange={(e) => setConvInput(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono text-base focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={fromUnit}
                    onChange={(e) => setFromUnit(e.target.value)}
                    className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {convCategory === "length" && (
                      <>
                        <option value="m">Meters (m)</option>
                        <option value="km">Kilometers (km)</option>
                        <option value="cm">Centimeters (cm)</option>
                        <option value="ft">Feet (ft)</option>
                        <option value="in">Inches (in)</option>
                        <option value="mi">Miles (mi)</option>
                        <option value="yd">Yards (yd)</option>
                      </>
                    )}
                    {convCategory === "mass" && (
                      <>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="g">Grams (g)</option>
                        <option value="lb">Pounds (lb)</option>
                        <option value="oz">Ounces (oz)</option>
                        <option value="ton">Metric Ton</option>
                      </>
                    )}
                    {convCategory === "temperature" && (
                      <>
                        <option value="C">Celsius (°C)</option>
                        <option value="F">Fahrenheit (°F)</option>
                        <option value="K">Kelvin (K)</option>
                      </>
                    )}
                    {convCategory === "digital" && (
                      <>
                        <option value="B">Bytes (B)</option>
                        <option value="KB">Kilobytes (KB)</option>
                        <option value="MB">Megabytes (MB)</option>
                        <option value="GB">Gigabytes (GB)</option>
                        <option value="TB">Terabytes (TB)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    const temp = fromUnit;
                    setFromUnit(toUnit);
                    setToUnit(temp);
                  }}
                  className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 hover:bg-slate-800 text-indigo-400 flex items-center justify-center transition-all shadow"
                  title="Swap units"
                >
                  <i className="fa-solid fa-arrow-down-up text-xs"></i>
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400">Converted Output</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold text-base flex items-center">
                    {convOutput || "0"}
                  </div>
                  <select
                    value={toUnit}
                    onChange={(e) => setToUnit(e.target.value)}
                    className="bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    {convCategory === "length" && (
                      <>
                        <option value="ft">Feet (ft)</option>
                        <option value="m">Meters (m)</option>
                        <option value="km">Kilometers (km)</option>
                        <option value="cm">Centimeters (cm)</option>
                        <option value="in">Inches (in)</option>
                        <option value="mi">Miles (mi)</option>
                        <option value="yd">Yards (yd)</option>
                      </>
                    )}
                    {convCategory === "mass" && (
                      <>
                        <option value="lb">Pounds (lb)</option>
                        <option value="kg">Kilograms (kg)</option>
                        <option value="g">Grams (g)</option>
                        <option value="oz">Ounces (oz)</option>
                        <option value="ton">Metric Ton</option>
                      </>
                    )}
                    {convCategory === "temperature" && (
                      <>
                        <option value="F">Fahrenheit (°F)</option>
                        <option value="C">Celsius (°C)</option>
                        <option value="K">Kelvin (K)</option>
                      </>
                    )}
                    {convCategory === "digital" && (
                      <>
                        <option value="GB">Gigabytes (GB)</option>
                        <option value="MB">Megabytes (MB)</option>
                        <option value="KB">Kilobytes (KB)</option>
                        <option value="B">Bytes (B)</option>
                        <option value="TB">Terabytes (TB)</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Slide-Over Drawer */}
        {showHistory && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md rounded-3xl p-5 flex flex-col z-20 transition-all">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-clock-rotate-left text-indigo-400 text-sm"></i>
                <h3 className="font-bold text-sm text-white">Calculation Ledger</h3>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={() => setHistory([])}
                    className="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                  <i className="fa-regular fa-folder-open text-2xl"></i>
                  <span>No recent calculations</span>
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setDisplay(item.result);
                      setShowHistory(false);
                      setResetNext(true);
                    }}
                    className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl hover:border-indigo-500/50 cursor-pointer transition-all space-y-1 group"
                  >
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>{item.timestamp}</span>
                      <span className="capitalize text-indigo-400/80 text-[10px]">{item.mode}</span>
                    </div>
                    <div className="text-xs text-slate-300 font-mono truncate">{item.expression}</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono text-right group-hover:text-emerald-300">
                      = {item.result}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
`;

export const CALCULATOR_README_MD = `# OmniCalc Pro — Scientific & Financial Calculation Suite

An autonomous, multi-disciplinary computational suite engineered for precision arithmetic, trigonometric analysis, loan amortization modeling, and dimensional unit conversion.

## System Architecture & System Design

OmniCalc Pro implements a decoupled state-machine architecture separating mathematical evaluation, IEEE 754 precision safeguards, and responsive reactive presentation:

\`\`\`
+-------------------------------------------------------------------------+
|                              OmniCalc Pro                               |
+-------------------------------------------------------------------------+
       |                                              |
       v                                              v
+-----------------------------+              +-----------------------------+
|   Interactive UI Engine     |              |     Math & Finance Core     |
| - Standard Keypad Matrix    |              | - Tokenizer & Precedence    |
| - Scientific Trig Ribbon    | <----------> | - IEEE 754 Rounding Formatter|
| - Loan Amortization Matrix  |              | - Loan EMI Formula Engine   |
| - Bidirectional Converter   |              | - Dimensional Unit Vectors  |
+-----------------------------+              +-----------------------------+
       |                                              |
       +----------------------+-----------------------+
                              v
                +---------------------------+
                |  Persistent Memory Bank   |
                | - Registers (MC, MR, M±)  |
                | - Timestamped Audit Log   |
                | - Keyboard Dispatcher     |
                +---------------------------+
\`\`\`

## Functional Capabilities

1. **Standard Arithmetic Engine**:
   - Four-function basic operations with order of operations (BODMAS).
   - Parenthetical sub-expressions, percentages, sign toggling, and floating-point error truncation.

2. **Scientific & Engineering Suite**:
   - Trigonometry: \`sin\`, \`cos\`, \`tan\`, \`asin\`, \`acos\`, \`atan\`.
   - Degree / Radian toggle switch (\`DEG\` vs \`RAD\`).
   - Logarithms: Natural logarithm (\`ln\`) and Common logarithm (\`log10\`).
   - Exponential & Powers: \`xʸ\`, \`x²\`, \`√x\`, reciprocal (\`1/x\`), factorial (\`n!\`).
   - Mathematical Constants: Archimedes' Constant \`π\` and Euler's Number \`e\`.

3. **Financial Loan & EMI Amortization**:
   - Computes Equated Monthly Installment (\`EMI\`) using standard financial amortization formulas:
     $$EMI = \\frac{P \\times r \\times (1 + r)^n}{(1 + r)^n - 1}$$
   - Dynamic real-time sliders for Principal ($10k - $1M), Interest Rate (1% - 20%), and Tenure (1 - 40 Years).
   - Breakdowns for Total Interest, Total Repayment Amount, Principal-to-Interest visual ratio, and a monthly amortization table.

4. **Dimensional Unit Converter**:
   - Length: Meters, Kilometers, Centimeters, Feet, Inches, Miles, Yards.
   - Mass: Kilograms, Grams, Pounds, Ounces, Metric Tons.
   - Temperature: Celsius, Fahrenheit, Kelvin.
   - Digital Storage: Bytes, KB, MB, GB, TB.

5. **Hardware & Usability Integrations**:
   - Tactile keyboard event listeners for rapid calculations.
   - Dual-line OLED display showing calculation history and active operand.
   - Click-to-copy result clipboard integration.
   - Persistent calculation audit trail with recall and clear capabilities.

## Verification & Testing Suite

Automated validation is verified across all mathematical modules via bun test:
\`\`\`bash
bun test tests/calculator.test.ts
\`\`\`
`;

export const CALCULATOR_TEST_TS = `import { test, expect } from "bun:test";
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
`;

export const CALCULATOR_TSX = CALCULATOR_APP_TSX;
export const CALCULATOR_TEST_PY = CALCULATOR_TEST_TS;

