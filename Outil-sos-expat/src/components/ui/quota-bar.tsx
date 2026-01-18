/**
 * =============================================================================
 * QUOTA BAR - Visual progress bar for AI quota
 * =============================================================================
 * 2026 Design: Clean, gradient, no dark mode
 */

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

export interface QuotaBarProps {
  used: number;
  total: number;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Warning message when quota is almost exhausted */
  warningMessage?: string;
}

export function QuotaBar({
  used,
  total,
  label,
  showIcon = true,
  size = "md",
  className,
  warningMessage,
}: QuotaBarProps) {
  const { t } = useLanguage({ mode: "provider" });
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;

  // P0 DEBUG: Log quota values to detect NaN/undefined issues
  console.log("[QuotaBar] 📈", {
    used,
    total,
    percentage,
    isUsedValid: typeof used === "number" && !Number.isNaN(used),
    isTotalValid: typeof total === "number" && !Number.isNaN(total) && total > 0,
    calculatedWidth: `${percentage}%`,
  });

  // Use translated warning message or provided one
  const quotaWarning = warningMessage || t("provider:dashboard.quota.almostReached");

  const getBarColor = () => {
    if (percentage >= 90) return "bg-gradient-to-r from-red-500 to-red-600";
    if (percentage >= 70) return "bg-gradient-to-r from-amber-400 to-amber-500";
    return "bg-gradient-to-r from-orange-400 to-amber-500";
  };

  const getTextColor = () => {
    if (percentage >= 90) return "text-red-600";
    if (percentage >= 70) return "text-amber-600";
    return "text-orange-600";
  };

  const sizeStyles = {
    sm: { bar: "h-1.5", text: "text-xs", icon: "w-3.5 h-3.5" },
    md: { bar: "h-2", text: "text-sm", icon: "w-4 h-4" },
    lg: { bar: "h-3", text: "text-base", icon: "w-5 h-5" },
  };

  const styles = sizeStyles[size];

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showIcon && (
            <Sparkles className={cn(styles.icon, getTextColor())} />
          )}
          {label && (
            <span className={cn("font-medium text-gray-700", styles.text)}>
              {label}
            </span>
          )}
        </div>
        <span className={cn("font-semibold", styles.text, getTextColor())}>
          {used} / {total}
        </span>
      </div>
      <div className={cn("w-full bg-gray-100 rounded-full overflow-hidden", styles.bar)}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {percentage >= 90 && (
        <p className="text-xs text-red-600">
          {quotaWarning}
        </p>
      )}
    </div>
  );
}

export default QuotaBar;
