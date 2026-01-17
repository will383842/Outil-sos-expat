import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "./card"

export interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: "default" | "red" | "green" | "blue" | "amber" | "purple"
  subValue?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

const colorVariants = {
  default: "bg-gray-100 text-gray-600",
  red: "bg-sos-red-100 text-sos-red-600",
  green: "bg-green-100 text-green-600",
  blue: "bg-blue-100 text-blue-600",
  amber: "bg-amber-100 text-amber-600",
  purple: "bg-purple-100 text-purple-600",
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, icon: Icon, color = "default", subValue, trend, className }, ref) => {
    return (
      <Card ref={ref} className={cn("hover:shadow-card-hover transition-shadow", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {trend && (
                  <span
                    className={cn(
                      "text-xs font-medium",
                      trend.isPositive ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {trend.isPositive ? "+" : ""}{trend.value}%
                  </span>
                )}
              </div>
              {subValue && (
                <p className="text-xs text-muted-foreground">{subValue}</p>
              )}
            </div>
            {Icon && (
              <div className={cn("rounded-full p-3", colorVariants[color])}>
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard }
