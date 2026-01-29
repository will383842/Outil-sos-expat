/**
 * PioneersPage
 *
 * Public page showing early adopter counters by country
 * and list of pioneers who have joined.
 */

import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import Layout from "@/components/layout/Layout";
import { CountryCountersGrid } from "@/components/Pioneers/CountryCountersGrid";
import { useEarlyAdopters } from "@/hooks/useEarlyAdopters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Users, Globe, Star, Sparkles, Info } from "lucide-react";

const PioneersPage: React.FC = () => {
  const intl = useIntl();
  const { counters, isLoading, error } = useEarlyAdopters();

  // Calculate total spots remaining
  const totalRemaining = counters.reduce(
    (sum, c) => sum + (c.maxEarlyAdopters - c.currentCount),
    0
  );
  const totalPioneers = counters.reduce((sum, c) => sum + c.currentCount, 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 dark:from-amber-500/5 dark:via-orange-500/5 dark:to-yellow-500/5" />
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-300/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-6">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-800 dark:text-amber-300 font-medium">
                  <FormattedMessage
                    id="pioneers.limitedOffer"
                    defaultMessage="Offre limitee - 100 places par pays"
                  />
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
                <FormattedMessage
                  id="pioneers.title"
                  defaultMessage="Devenez un"
                />{" "}
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent">
                  <FormattedMessage
                    id="pioneers.titleHighlight"
                    defaultMessage="Pioneer"
                  />
                </span>
              </h1>

              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                <FormattedMessage
                  id="pioneers.subtitle"
                  defaultMessage="Les 100 premiers Chatters de chaque pays beneficient d'un bonus de +50% a vie sur toutes leurs commissions de parrainage !"
                />
              </p>

              {/* Stats */}
              <div className="flex flex-wrap justify-center gap-6 mb-12">
                <div className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/10 rounded-xl shadow-lg">
                  <Users className="w-6 h-6 text-amber-500" />
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isLoading ? "..." : totalPioneers}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.totalPioneers"
                        defaultMessage="Pioneers"
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/10 rounded-xl shadow-lg">
                  <Globe className="w-6 h-6 text-amber-500" />
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isLoading ? "..." : counters.length}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.countries"
                        defaultMessage="Pays"
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-white/10 rounded-xl shadow-lg">
                  <Star className="w-6 h-6 text-amber-500" />
                  <div className="text-left">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {isLoading ? "..." : totalRemaining}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.spotsRemaining"
                        defaultMessage="Places restantes"
                      />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Benefits Section */}
          <Card className="mb-12 border-amber-200 dark:border-amber-800/30 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Award className="w-6 h-6 text-amber-500" />
                <FormattedMessage
                  id="pioneers.benefitsTitle"
                  defaultMessage="Avantages Pioneer"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl font-bold text-amber-600">+50%</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      <FormattedMessage
                        id="pioneers.bonus50"
                        defaultMessage="Bonus +50% a vie"
                      />
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.bonus50Desc"
                        defaultMessage="Sur toutes vos commissions de parrainage, pour toujours"
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      <FormattedMessage
                        id="pioneers.badge"
                        defaultMessage="Badge Pioneer"
                      />
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.badgeDesc"
                        defaultMessage="Distinction speciale visible sur votre profil"
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      <FormattedMessage
                        id="pioneers.priority"
                        defaultMessage="Acces prioritaire"
                      />
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.priorityDesc"
                        defaultMessage="Aux nouvelles fonctionnalites et promotions"
                      />
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mb-8">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            </div>
          )}

          {/* Country Counters */}
          {!isLoading && counters.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                <Globe className="w-6 h-6 text-amber-500" />
                <FormattedMessage
                  id="pioneers.byCountry"
                  defaultMessage="Places disponibles par pays"
                />
              </h2>
              <CountryCountersGrid counters={counters} />
            </div>
          )}

          {/* How to become a Pioneer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Info className="w-5 h-5 text-amber-500" />
                <FormattedMessage
                  id="pioneers.howToBecomeTitle"
                  defaultMessage="Comment devenir Pioneer ?"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex items-start gap-3">
                  <Badge className="bg-amber-500 text-white flex-shrink-0">1</Badge>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      <FormattedMessage
                        id="pioneers.step1Title"
                        defaultMessage="Inscrivez-vous comme Chatter"
                      />
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.step1Desc"
                        defaultMessage="Creez votre compte et rejoignez le programme Chatter"
                      />
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Badge className="bg-amber-500 text-white flex-shrink-0">2</Badge>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      <FormattedMessage
                        id="pioneers.step2Title"
                        defaultMessage="Verifiez votre pays"
                      />
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.step2Desc"
                        defaultMessage="Assurez-vous que des places sont encore disponibles dans votre pays"
                      />
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Badge className="bg-amber-500 text-white flex-shrink-0">3</Badge>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      <FormattedMessage
                        id="pioneers.step3Title"
                        defaultMessage="Attribution automatique"
                      />
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <FormattedMessage
                        id="pioneers.step3Desc"
                        defaultMessage="Si des places sont disponibles, le statut Pioneer vous est automatiquement attribue"
                      />
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default PioneersPage;
