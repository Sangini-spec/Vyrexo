interface StatusBarProps {
  status: "connected" | "disconnected" | "connecting";
}

export function StatusBar({ status }: StatusBarProps) {
  const colors = {
    connected: "bg-[#22c55e] shadow-[0_0_6px_#22c55e88]",
    disconnected: "bg-red-500",
    connecting: "bg-yellow-500 animate-pulse",
  };

  const labels = {
    connected: "Connected",
    disconnected: "Disconnected",
    connecting: "Connecting...",
  };

  return (
    <div className="flex items-center gap-[4px] text-[11px] text-[var(--muted2)]">
      <div className={`w-[6px] h-[6px] rounded-full ${colors[status]}`} />
      <span>{labels[status]}</span>
    </div>
  );
}
