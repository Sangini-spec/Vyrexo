export interface ProjectConfig {
  name: string;
  version: string;
  status: "idle" | "running" | "completed";
  telemetryActive?: boolean;
}

export interface MetricItem {
  id: string;
  label: string;
  value: number;
  unit: string;
  status: "normal" | "warning" | "critical";
}
