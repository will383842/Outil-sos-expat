/**
 * =============================================================================
 * QUICK ACTIONS - Actions rapides du dashboard
 * =============================================================================
 */

import { Link } from "react-router-dom";
import { Zap, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { cn } from "../../lib/utils";

export interface QuickActionItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  color?: string;
}

export interface QuickActionsProps {
  actions: QuickActionItem[];
  title?: string;
  columns?: 2 | 3 | 4;
}

export function QuickActions({
  actions,
  title = "Actions rapides",
  columns = 2,
}: QuickActionsProps) {
  const gridColsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-sos-red-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn("grid gap-3", gridColsClass)}>
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                to={action.href}
                className={cn(
                  "group flex items-start gap-3 p-4 rounded-lg border border-gray-200",
                  "bg-white hover:bg-gray-50 hover:border-gray-300",
                  "transition-all duration-200 hover:shadow-sm"
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg shrink-0 transition-colors",
                    action.color || "bg-sos-red-100 text-sos-red-600 group-hover:bg-sos-red-200"
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 group-hover:text-sos-red-600 transition-colors">
                    {action.label}
                  </div>
                  {action.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {action.description}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default QuickActions;
