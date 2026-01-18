/**
 * =============================================================================
 * KPI CARD - Modern stat card with trend indicator
 * =============================================================================
 * 2026 Design: Clean, minimal, no dark mode, subtle shadows
 */

import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string;
}

const variantStyles = {
  default: {
    bg: "bg-white",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-600",
    border: "border-gray-100",
  },
  primary: {
    bg: "bg-white",
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    border: "border-red-100",
  },
  success: {
    bg: "bg-white",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    border: "border-emerald-100",
  },
  warning: {
    bg: "bg-white",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    border: "border-amber-100",
  },
};

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  variant = "default",
  className,
}: KPICardProps) {
  const styles = variantStyles[variant];

  // P0 DEBUG: Log KPI values to detect undefined/NaN issues
  console.log("[KPICard] 📊", {
    title,
    value,
    valueType: typeof value,
    isValueValid: value !== undefined && value !== null && value !== "" && !Number.isNaN(value),
    subtitle,
    variant,
  });

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="w-3.5 h-3.5" />;
    if (trend.value < 0) return <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value > 0) return "text-emerald-600 bg-emerald-50";
    if (trend.value < 0) return "text-red-600 bg-red-50";
    return "text-gray-500 bg-gray-100";
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        styles.bg,
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                getTrendColor()
              )}
            >
              {getTrendIcon()}
              <span>
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-gray-500 ml-1">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={cn(
              "p-3 rounded-xl",
              styles.iconBg,
              styles.iconColor
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default KPICard;
