import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, actions, className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("mb-8 space-y-4", className)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
        {children}
      </div>
    )
  }
)
PageHeader.displayName = "PageHeader"

export { PageHeader }
