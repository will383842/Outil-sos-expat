import { Clock, Phone, CheckCircle, XCircle, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { useLanguage } from "../../hooks/useLanguage"

export type BookingStatus = "pending" | "in_progress" | "completed" | "cancelled"

export interface StatusConfig {
  labelKey: string
  color: string
  bgColor: string
  icon: LucideIcon
}

export const STATUS_CONFIG: Record<BookingStatus, StatusConfig> = {
  pending: {
    labelKey: "common:status.pending",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: Clock,
  },
  in_progress: {
    labelKey: "common:status.inProgress",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: Phone,
  },
  completed: {
    labelKey: "common:status.completed",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: CheckCircle,
  },
  cancelled: {
    labelKey: "common:status.cancelled",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
    icon: XCircle,
  },
}

export interface StatusBadgeProps {
  status: BookingStatus
  showIcon?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeVariants = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-0.5",
  lg: "text-base px-3 py-1",
}

const iconSizeVariants = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
}

function StatusBadge({ status, showIcon = true, size = "md", className }: StatusBadgeProps) {
  const { t } = useLanguage({ mode: "provider" })
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Badge
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border-0",
        config.bgColor,
        config.color,
        sizeVariants[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizeVariants[size]} />}
      {t(config.labelKey)}
    </Badge>
  )
}

export { StatusBadge }
