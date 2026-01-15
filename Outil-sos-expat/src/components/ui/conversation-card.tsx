/**
 * =============================================================================
 * CONVERSATION CARD - Modern conversation list item
 * =============================================================================
 * 2026 Design: Clean, spacious, no dark mode, subtle hover effects
 */

import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Scale, Globe, ArrowRight, Clock, MessageSquare } from "lucide-react";

export interface ConversationCardProps {
  id: string;
  clientName: string;
  subject: string;
  messagesCount?: number;
  providerType?: "lawyer" | "expat";
  status?: "active" | "completed" | "archived";
  timeAgo?: string;
  className?: string;
}

const statusStyles = {
  active: {
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  completed: {
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  archived: {
    badge: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
};

export function ConversationCard({
  id,
  clientName,
  subject,
  messagesCount,
  providerType = "lawyer",
  status = "completed",
  timeAgo,
  className,
}: ConversationCardProps) {
  const isLawyer = providerType === "lawyer";
  const styles = statusStyles[status];

  return (
    <Link
      to={`/dashboard/conversation/${id}`}
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl",
        "bg-white border border-gray-100",
        "hover:border-gray-200 hover:shadow-sm",
        "transition-all duration-150",
        className
      )}
    >
      {/* Type Icon */}
      <div
        className={cn(
          "p-3 rounded-xl shrink-0",
          isLawyer ? "bg-blue-50" : "bg-emerald-50"
        )}
      >
        {isLawyer ? (
          <Scale className="w-5 h-5 text-blue-600" />
        ) : (
          <Globe className="w-5 h-5 text-emerald-600" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-red-600 transition-colors">
            {clientName}
          </h3>
          {status === "active" && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                styles.badge
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", styles.dot)} />
              En cours
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 truncate mb-2">{subject}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          {messagesCount !== undefined && (
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {messagesCount} échanges
            </span>
          )}
          {timeAgo && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {timeAgo}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-5 h-5 text-gray-300 shrink-0 group-hover:text-red-500 group-hover:translate-x-1 transition-all duration-150" />
    </Link>
  );
}

export default ConversationCard;
