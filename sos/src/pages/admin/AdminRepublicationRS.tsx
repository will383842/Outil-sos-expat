/**
 * AdminRepublicationRS - Republication automatique sur les réseaux sociaux
 *
 * Onglets : LinkedIn, Pinterest, Threads, Facebook, Instagram, Reddit
 */

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Linkedin,
  Pin,
  AtSign,
  Facebook,
  Instagram,
  MessageSquare,
  Share2,
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";

type Platform = "linkedin" | "pinterest" | "threads" | "facebook" | "instagram" | "reddit";

interface PlatformConfig {
  id: Platform;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Republication des articles et actualités sur LinkedIn",
  },
  {
    id: "pinterest",
    label: "Pinterest",
    icon: Pin,
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200",
    description: "Epingler les visuels et contenus sur Pinterest",
  },
  {
    id: "threads",
    label: "Threads",
    icon: AtSign,
    color: "text-gray-900",
    bgColor: "bg-gray-50 border-gray-200",
    description: "Publier des fils de discussion sur Threads",
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: Facebook,
    color: "text-blue-600",
    bgColor: "bg-blue-50 border-blue-100",
    description: "Partager les contenus sur la page Facebook SOS Expat",
  },
  {
    id: "instagram",
    label: "Instagram",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50 border-pink-200",
    description: "Publier photos et stories sur Instagram",
  },
  {
    id: "reddit",
    label: "Reddit",
    icon: MessageSquare,
    color: "text-orange-600",
    bgColor: "bg-orange-50 border-orange-200",
    description: "Partager les articles dans les subreddits ciblés",
  },
];

export default function AdminRepublicationRS() {
  const { platform = "linkedin" } = useParams<{ platform: Platform }>();
  const navigate = useNavigate();

  const activePlatform =
    PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Share2 className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Republication RS
            </h1>
          </div>
          <p className="text-gray-500 text-sm">
            Gérez la republication automatique des contenus sur les réseaux
            sociaux
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const isActive = p.id === activePlatform.id;
            return (
              <button
                key={p.id}
                onClick={() =>
                  navigate(`/admin/marketing/republication-rs/${p.id}`)
                }
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div
          className={`rounded-xl border p-8 ${activePlatform.bgColor} min-h-64 flex flex-col items-center justify-center text-center gap-4`}
        >
          {React.createElement(activePlatform.icon, {
            className: `w-12 h-12 ${activePlatform.color}`,
          })}
          <div>
            <h2 className={`text-xl font-semibold mb-1 ${activePlatform.color}`}>
              {activePlatform.label}
            </h2>
            <p className="text-gray-500 text-sm max-w-md">
              {activePlatform.description}
            </p>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-gray-200 text-xs text-gray-500">
            Fonctionnalité en cours de développement
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
