/**
 * AdminEarlyAdopters
 *
 * Admin page for managing Early Adopter (Pioneer) program.
 * View pioneers by country, adjust quotas, and manage status.
 */

import React, { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  RefreshCw,
  Award,
  Globe,
  Settings,
  AlertTriangle,
  Users,
  Sparkles,
} from "lucide-react";

interface EarlyAdopterCounter {
  countryCode: string;
  countryName: string;
  currentCount: number;
  maxSlots: number;
  isFull: boolean;
}

interface EarlyAdopter {
  id: string;
  name: string;
  email: string;
  country: string;
  countryName: string;
  earlyAdopterDate: string;
  totalEarned: number;
  referralEarnings: number;
  qualifiedReferralsCount: number;
  multiplier: number;
}

const AdminEarlyAdopters: React.FC = () => {
  const [counters, setCounters] = useState<EarlyAdopterCounter[]>([]);
  const [pioneers, setPioneers] = useState<EarlyAdopter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [newQuota, setNewQuota] = useState<number>(100);
  const [isUpdatingQuota, setIsUpdatingQuota] = useState(false);

  const functions = getFunctions(undefined, "europe-west1");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const getEarlyAdoptersFn = httpsCallable<
        { countryCode?: string },
        { counters: EarlyAdopterCounter[]; pioneers: EarlyAdopter[] }
      >(functions, "adminGetEarlyAdopters");

      const result = await getEarlyAdoptersFn({
        countryCode: selectedCountry || undefined,
      });
      setCounters(result.data.counters);
      setPioneers(result.data.pioneers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [functions, selectedCountry]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateQuota = async (countryCode: string) => {
    setIsUpdatingQuota(true);
    try {
      const updateQuotaFn = httpsCallable<
        { countryCode: string; newMaxSlots: number },
        { success: boolean }
      >(functions, "adminUpdateEarlyAdopterQuota");

      await updateQuotaFn({ countryCode, newMaxSlots: newQuota });
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update quota");
    } finally {
      setIsUpdatingQuota(false);
    }
  };

  // Calculate totals
  const totalPioneers = counters.reduce((sum, c) => sum + c.currentCount, 0);
  const totalSlots = counters.reduce((sum, c) => sum + c.maxSlots, 0);
  const totalRemaining = totalSlots - totalPioneers;

  // Country flags (simplified - would normally use a library)
  const getCountryFlag = (code: string) => {
    const flags: Record<string, string> = {
      SN: "🇸🇳",
      CI: "🇨🇮",
      CM: "🇨🇲",
      FR: "🇫🇷",
      US: "🇺🇸",
      CA: "🇨🇦",
      BE: "🇧🇪",
      CH: "🇨🇭",
      DE: "🇩🇪",
      GB: "🇬🇧",
      MA: "🇲🇦",
      TN: "🇹🇳",
      DZ: "🇩🇿",
      ML: "🇲🇱",
      BF: "🇧🇫",
      NE: "🇳🇪",
      TG: "🇹🇬",
      BJ: "🇧🇯",
      GA: "🇬🇦",
      CG: "🇨🇬",
      CD: "🇨🇩",
    };
    return flags[code.toUpperCase()] || "🌍";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-7 w-7 text-amber-500" />
            Programme Pioneers (Early Adopters)
          </h1>
          <p className="text-gray-500 mt-1">
            Gestion des quotas par pays et liste des pioneers
          </p>
        </div>
        <Button onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Total Pioneers
                </p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {totalPioneers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Globe className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pays actifs</p>
                <p className="text-2xl font-bold">{counters.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Places restantes</p>
                <p className="text-2xl font-bold text-green-600">{totalRemaining}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Country Counters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Quotas par Pays
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {counters.map((counter) => {
                const percentage = (counter.currentCount / counter.maxSlots) * 100;
                return (
                  <div
                    key={counter.countryCode}
                    className={`p-4 rounded-lg border ${
                      counter.isFull
                        ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                        : "border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getCountryFlag(counter.countryCode)}</span>
                        <div>
                          <p className="font-medium">{counter.countryName}</p>
                          <p className="text-xs text-gray-500">{counter.countryCode}</p>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCountry(counter.countryCode);
                              setNewQuota(counter.maxSlots);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Modifier quota - {counter.countryName}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-medium">
                                Nouveau quota
                              </label>
                              <Input
                                type="number"
                                value={newQuota}
                                onChange={(e) => setNewQuota(parseInt(e.target.value) || 0)}
                                className="mt-2"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Actuellement: {counter.currentCount} / {counter.maxSlots}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleUpdateQuota(counter.countryCode)}
                              disabled={isUpdatingQuota}
                              className="w-full"
                            >
                              {isUpdatingQuota ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : null}
                              Mettre à jour
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <Progress value={percentage} className="h-2 mb-2" />

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {counter.currentCount} / {counter.maxSlots}
                      </span>
                      {counter.isFull ? (
                        <Badge variant="destructive">Complet</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          {counter.maxSlots - counter.currentCount} places
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pioneers List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Liste des Pioneers
            </CardTitle>
            <Badge className="bg-amber-500 text-white">
              {pioneers.length} pioneers
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pioneers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucun pioneer trouvé
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pioneer</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Multiplicateur</TableHead>
                  <TableHead>Filleuls qualifiés</TableHead>
                  <TableHead>Gains totaux</TableHead>
                  <TableHead>Gains parrainage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pioneers.map((pioneer) => (
                  <TableRow key={pioneer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{pioneer.name}</p>
                        <p className="text-xs text-gray-500">{pioneer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{getCountryFlag(pioneer.country)}</span>
                        <span>{pioneer.countryName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(pioneer.earlyAdopterDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-amber-500 text-white">
                        x{pioneer.multiplier.toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{pioneer.qualifiedReferralsCount}</TableCell>
                    <TableCell className="font-semibold">
                      ${(pioneer.totalEarned / 100).toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${(pioneer.referralEarnings / 100).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEarlyAdopters;
