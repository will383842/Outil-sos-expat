import { Scale, Globe, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "./badge"
import { useLanguage } from "../../hooks/useLanguage"

export type ProviderType = "lawyer" | "expat"

export interface ProviderTypeConfig {
  labelKey: string
  color: string
  bgColor: string
  icon: LucideIcon
}

export const PROVIDER_TYPE_CONFIG: Record<ProviderType, ProviderTypeConfig> = {
  lawyer: {
    labelKey: "common:providerTypes.lawyer",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: Scale,
  },
  expat: {
    labelKey: "common:providerTypes.expatExpert",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
    icon: Globe,
  },
}

export interface ProviderTypeBadgeProps {
  type: ProviderType
  showIcon?: boolean
  showLabel?: boolean
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

function ProviderTypeBadge({ type, showIcon = true, showLabel = true, size = "md", className }: ProviderTypeBadgeProps) {
  const { t } = useLanguage({ mode: "provider" })
  const config = PROVIDER_TYPE_CONFIG[type]
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
      {showLabel && t(config.labelKey)}
    </Badge>
  )
}

export { ProviderTypeBadge }
