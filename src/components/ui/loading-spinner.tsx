import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  message?: string
  fullScreen?: boolean
  className?: string
}

const sizeVariants = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = "md", message, fullScreen = false, className }, ref) => {
    const content = (
      <div
        ref={ref}
        className={cn(
          "flex flex-col items-center justify-center gap-3",
          fullScreen && "min-h-screen",
          className
        )}
      >
        <Loader2 className={cn("animate-spin text-sos-red", sizeVariants[size])} />
        {message && (
          <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
        )}
      </div>
    )

    if (fullScreen) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          {content}
        </div>
      )
    }

    return content
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

export { LoadingSpinner }
