interface ModeIndicatorProps {
  mode: string;
}

const MODE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string }> = {
  normal: { label: "Normal", bg: "bg-[var(--midnight-dim)]", border: "border-[#3B599833]", text: "text-[var(--steel)]" },
  debug: { label: "Debug", bg: "bg-[#ea580c1a]", border: "border-[#ea580c33]", text: "text-[#fb923c]" },
  rubber_duck: { label: "Rubber Duck", bg: "bg-[#eab3081a]", border: "border-[#eab30833]", text: "text-[#fbbf24]" },
  ship_it: { label: "Ship It", bg: "bg-[#16a34a1a]", border: "border-[#16a34a33]", text: "text-[#4ade80]" },
  whiteboard: { label: "Whiteboard", bg: "bg-[#3B59981a]", border: "border-[#3B599833]", text: "text-[var(--ice)]" },
};

export function ModeIndicator({ mode }: ModeIndicatorProps) {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.normal;

  return (
    <span
      className={`rounded-[10px] px-[10px] py-[2px] text-[10.5px] font-semibold border ${config.bg} ${config.border} ${config.text}`}
    >
      {config.label}
    </span>
  );
}
