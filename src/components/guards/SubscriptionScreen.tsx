/**
 * =============================================================================
 * SUBSCRIPTION SCREEN - Écran d'abonnement attractif
 * =============================================================================
 */

import { Sparkles, Clock, Globe, Shield, CreditCard, Check, ExternalLink } from "lucide-react";

// Configuration des prix depuis les variables d'environnement
// En production, ces valeurs sont gérées via .env ou Firebase Remote Config
const PRICING_CONFIG = {
  lawyer: {
    monthly: parseInt(import.meta.env.VITE_PRICE_LAWYER_MONTHLY || "49", 10),
    annual: parseInt(import.meta.env.VITE_PRICE_LAWYER_ANNUAL || "470", 10),
    get savings() { return this.monthly * 12 - this.annual; }
  },
  expat: {
    monthly: parseInt(import.meta.env.VITE_PRICE_EXPAT_MONTHLY || "29", 10),
    annual: parseInt(import.meta.env.VITE_PRICE_EXPAT_ANNUAL || "280", 10),
    get savings() { return this.monthly * 12 - this.annual; }
  }
};

// URL de base pour l'abonnement (configurable)
const SUBSCRIBE_BASE_URL = import.meta.env.VITE_SUBSCRIBE_URL || "https://sos-expat.com/subscribe";

export interface SubscriptionScreenProps {
  userEmail: string | null;
  providerType: "lawyer" | "expat" | null;
}

const benefits = [
  {
    icon: Sparkles,
    title: "Assistant IA en temps reel",
    description: "Recherche juridique instantanee pendant vos consultations",
  },
  {
    icon: Globe,
    title: "Donnees actualisees",
    description: "Acces aux informations legales de 190+ pays",
  },
  {
    icon: Clock,
    title: "Gain de temps",
    description: "Reponses precises en quelques secondes",
  },
  {
    icon: Shield,
    title: "Sources fiables",
    description: "Citations et references juridiques verifiees",
  },
];

export default function SubscriptionScreen({ userEmail, providerType }: SubscriptionScreenProps) {
  const isLawyer = providerType === "lawyer";

  const handleSignOut = () => {
    import("../../lib/firebase").then(({ auth }) => {
      auth.signOut().then(() => {
        window.location.href = "/auth";
      });
    });
  };

  // Configuration des tarifs depuis la config (externalisée)
  const pricing = isLawyer ? PRICING_CONFIG.lawyer : PRICING_CONFIG.expat;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900">SOS Expat</h1>
              <p className="text-xs text-gray-500">Assistant IA pour prestataires</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Se deconnecter
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Abonnement requis
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Boostez vos consultations avec l'IA
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isLawyer
              ? "Accedez a un assistant juridique IA qui recherche en temps reel les informations legales dont vous avez besoin pendant vos consultations."
              : "Obtenez instantanement les informations pratiques sur l'expatriation pour mieux accompagner vos clients."}
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 border border-gray-200 flex gap-4"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <benefit.icon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Monthly */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mensuel</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900">{pricing.monthly}€</span>
              <span className="text-gray-500">/mois</span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                Acces illimite a l'assistant IA
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                Sans engagement
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                Resiliable a tout moment
              </li>
            </ul>
            <a
              href={`${SUBSCRIBE_BASE_URL}?plan=monthly&type=${providerType || "expat"}`}
              className="block w-full text-center bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Choisir mensuel
            </a>
          </div>

          {/* Annual - Recommended */}
          <div className="bg-white rounded-2xl border-2 border-red-500 p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              ECONOMISEZ {pricing.savings}€
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Annuel</h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900">{Math.round(pricing.annual / 12)}€</span>
              <span className="text-gray-500">/mois</span>
              <p className="text-sm text-gray-500">Facture {pricing.annual}€/an</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                Acces illimite a l'assistant IA
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                2 mois offerts
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-600">
                <Check className="w-4 h-4 text-green-500" />
                Support prioritaire
              </li>
            </ul>
            <a
              href={`${SUBSCRIBE_BASE_URL}?plan=annual&type=${providerType || "expat"}`}
              className="flex items-center justify-center gap-2 w-full bg-red-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              S'abonner maintenant
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <img src="https://cdn.jsdelivr.net/gh/lipis/flag-icons/flags/4x3/eu.svg" alt="EU" className="w-6 h-4" />
            <CreditCard className="w-5 h-5 text-gray-400" />
            <Shield className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mb-1">
            <strong>Paiement securise par carte bancaire</strong>
          </p>
          <p className="text-xs text-gray-500">
            Visa, Mastercard, American Express - Paiement crypte SSL - Conformite PCI-DSS
          </p>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-gray-500">
            Des questions ? <a href="https://sos-expat.com/contact" className="text-red-600 hover:underline">Contactez-nous</a>
          </p>
          {userEmail && (
            <p className="text-xs text-gray-400">
              Connecte en tant que {userEmail}
            </p>
          )}
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-200 py-6">
        <p className="text-center text-xs text-gray-400">
          {new Date().getFullYear()} SOS Expats. Tous droits reserves.
        </p>
      </div>
    </div>
  );
}
