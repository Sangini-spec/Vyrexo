export type CalculatorMode = "standard" | "scientific" | "financial" | "converter";

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
