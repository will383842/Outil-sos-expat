/**
 * =============================================================================
 * RECENT BOOKINGS - Liste des dossiers récents
 * =============================================================================
 */

import { Link } from "react-router-dom";
import { Calendar, Scale, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import { formatRelativeDate, DateInput } from "../../utils/formatDate";
import { STATUS_CONFIG, BookingStatus } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { useLanguage } from "../../hooks/useLanguage";

export interface BookingItem {
  id: string;
  clientName?: string;
  category?: string;
  status: string;
  providerType?: string;
  createdAt?: DateInput;
}

export interface RecentBookingsProps {
  bookings: BookingItem[];
  onBookingClick?: (id: string) => void;
  isLoading?: boolean;
  maxItems?: number;
}

function BookingItemSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  );
}

function EmptyState({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <Calendar className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm text-muted-foreground">
        {t("provider:dashboard.noDossiers")}
      </p>
    </div>
  );
}

export function RecentBookings({
  bookings,
  onBookingClick,
  isLoading = false,
  maxItems = 5,
}: RecentBookingsProps) {
  const { t } = useLanguage({ mode: "provider" });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sos-red-600" />
            {t("provider:dashboard.recentDossiers")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {Array.from({ length: maxItems }).map((_, i) => (
              <BookingItemSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedBookings = bookings.slice(0, maxItems);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sos-red-600" />
          {t("provider:dashboard.recentDossiers")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {displayedBookings.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          <div className="space-y-1">
            {displayedBookings.map((booking) => {
              const statusConfig = STATUS_CONFIG[booking.status as BookingStatus] || STATUS_CONFIG.pending;
              const isLawyer = booking.providerType === "lawyer";

              const content = (
                <div
                  className={cn(
                    "flex items-center justify-between py-3 border-b border-gray-100 last:border-0",
                    "hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                  )}
                  onClick={() => onBookingClick?.(booking.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        isLawyer ? "bg-blue-100" : "bg-green-100"
                      )}
                    >
                      {isLawyer ? (
                        <Scale className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Globe className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {booking.clientName || `#${booking.id.substring(0, 8)}...`}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {booking.category && (
                          <span>{booking.category}</span>
                        )}
                        {booking.category && booking.createdAt && (
                          <span className="text-gray-300">•</span>
                        )}
                        {booking.createdAt && (
                          <span>{formatRelativeDate(booking.createdAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn("text-xs font-medium", statusConfig.color)}
                  >
                    {statusConfig.label}
                  </Badge>
                </div>
              );

              // Wrap with Link if no custom onClick handler
              if (!onBookingClick) {
                return (
                  <Link key={booking.id} to={`/dossiers/${booking.id}`}>
                    {content}
                  </Link>
                );
              }

              return <div key={booking.id}>{content}</div>;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentBookings;
