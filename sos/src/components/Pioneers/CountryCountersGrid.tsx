/**
 * CountryCountersGrid
 *
 * Responsive grid of country early adopter counters.
 */

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, SortAsc, SortDesc } from "lucide-react";
import { ChatterEarlyAdopterCounter } from "@/types/chatter";
import { CountryCounter } from "./CountryCounter";
import { useEarlyAdopters } from "@/hooks/useEarlyAdopters";
import { useTranslation } from "@/hooks/useTranslation";

interface CountryCountersGridProps {
  counters?: ChatterEarlyAdopterCounter[];
  showFilters?: boolean;
  maxItems?: number;
}

type SortOption = "remaining" | "count" | "name";

export function CountryCountersGrid({
  counters: externalCounters,
  showFilters = true,
  maxItems,
}: CountryCountersGridProps) {
  const { t } = useTranslation();
  const { counters: hookCounters, isLoading } = useEarlyAdopters();

  const counters = externalCounters || hookCounters;

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("remaining");
  const [sortAsc, setSortAsc] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  // Filter and sort counters
  const filteredCounters = counters
    .filter((counter) => {
      const matchesSearch =
        counter.countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        counter.countryCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOpen = showOpenOnly ? counter.isOpen : true;
      return matchesSearch && matchesOpen;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "remaining":
          comparison = a.remainingSlots - b.remainingSlots;
          break;
        case "count":
          comparison = a.currentCount - b.currentCount;
          break;
        case "name":
          comparison = a.countryName.localeCompare(b.countryName);
          break;
      }
      return sortAsc ? comparison : -comparison;
    })
    .slice(0, maxItems);

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(option);
      setSortAsc(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-40 bg-gray-200 rounded-lg animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t("pioneers.searchCountry")}
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Open only filter */}
          <Button
            variant={showOpenOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOpenOnly(!showOpenOnly)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {t("pioneers.openOnly")}
          </Button>

          {/* Sort buttons */}
          <div className="flex gap-1">
            <Button
              variant={sortBy === "remaining" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => toggleSort("remaining")}
            >
              {t("pioneers.spots")}
              {sortBy === "remaining" &&
                (sortAsc ? (
                  <SortAsc className="h-3 w-3 ml-1" />
                ) : (
                  <SortDesc className="h-3 w-3 ml-1" />
                ))}
            </Button>
            <Button
              variant={sortBy === "count" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => toggleSort("count")}
            >
              {t("pioneers.pioneers")}
              {sortBy === "count" &&
                (sortAsc ? (
                  <SortAsc className="h-3 w-3 ml-1" />
                ) : (
                  <SortDesc className="h-3 w-3 ml-1" />
                ))}
            </Button>
            <Button
              variant={sortBy === "name" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => toggleSort("name")}
            >
              A-Z
              {sortBy === "name" &&
                (sortAsc ? (
                  <SortAsc className="h-3 w-3 ml-1" />
                ) : (
                  <SortDesc className="h-3 w-3 ml-1" />
                ))}
            </Button>
          </div>
        </div>
      )}

      {/* Stats summary */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>
          <Badge variant="outline" className="mr-1">
            {filteredCounters.length}
          </Badge>
          {t("pioneers.countries")}
        </span>
        <span>
          <Badge variant="outline" className="mr-1">
            {filteredCounters.filter((c) => c.isOpen).length}
          </Badge>
          {t("pioneers.stillOpen")}
        </span>
      </div>

      {/* Grid */}
      {filteredCounters.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{t("pioneers.noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCounters.map((counter) => (
            <CountryCounter key={counter.countryCode} counter={counter} />
          ))}
        </div>
      )}
    </div>
  );
}
