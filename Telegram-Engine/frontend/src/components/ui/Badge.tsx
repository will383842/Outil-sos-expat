const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
  unsubscribed: "bg-gray-100 text-gray-700",
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
  queued: "bg-blue-100 text-blue-700",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  color?: string;
  className?: string;
}

export default function Badge({ children, variant, color, className = "" }: BadgeProps) {
  const colorClass = color
    ? ""
    : variant
      ? STATUS_COLORS[variant] ?? "bg-gray-100 text-gray-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass} ${className}`}
      style={color ? { backgroundColor: color + "20", color } : undefined}
    >
      {children}
    </span>
  );
}
