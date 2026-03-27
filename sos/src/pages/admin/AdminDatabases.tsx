import React from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { Database, Server, ExternalLink, CheckCircle, HardDrive, Globe } from "lucide-react";

interface DbProject {
  name: string;
  prefix: string;
  dbName: string;
  dbType: "PostgreSQL" | "MySQL" | "Firestore";
  host: string;
  port: number;
  url: string;
  vpsPath: string;
  containers: string[];
  status: "live" | "deprecated";
  notes?: string;
}

const projects: DbProject[] = [
  {
    name: "SOS-Expat (Principal)",
    prefix: "—",
    dbName: "Firestore (nam7 Iowa)",
    dbType: "Firestore",
    host: "Firebase Cloud",
    port: 0,
    url: "https://sos-expat.com",
    vpsPath: "Firebase / Cloudflare Pages",
    containers: [],
    status: "live",
    notes: "Projet principal — React + Firebase Functions (3 regions)",
  },
  {
    name: "Mission Control",
    prefix: "inf-",
    dbName: "mission_control",
    dbType: "PostgreSQL",
    host: "inf-postgres",
    port: 8090,
    url: "https://influenceurs.life-expat.com",
    vpsPath: "/opt/influenceurs-tracker/",
    containers: ["inf-app", "inf-postgres", "inf-redis", "inf-nginx-api", "inf-frontend", "inf-scheduler", "inf-queue", "inf-email-worker", "inf-scraper", "inf-content-scraper", "inf-content-worker", "inf-publication-worker"],
    status: "live",
    notes: "CRM influenceurs, contacts, rappels, AI research, content pipeline",
  },
  {
    name: "Telegram Engine",
    prefix: "tg-",
    dbName: "engine-telegram-sos-expat",
    dbType: "PostgreSQL",
    host: "tg-postgres",
    port: 8080,
    url: "https://engine-telegram-sos-expat.life-expat.com",
    vpsPath: "/opt/engine-telegram/",
    containers: ["tg-app", "tg-postgres", "tg-redis", "tg-nginx", "tg-queue", "tg-scheduler"],
    status: "live",
    notes: "3 bots Telegram : main, inbox, withdrawals",
  },
  {
    name: "Partner Engine",
    prefix: "pe-",
    dbName: "partner_engine",
    dbType: "PostgreSQL",
    host: "pe-postgres",
    port: 8083,
    url: "https://partner-engine.life-expat.com",
    vpsPath: "/opt/partner-engine/",
    containers: ["pe-app", "pe-postgres", "pe-redis", "pe-nginx", "pe-queue", "pe-scheduler"],
    status: "live",
    notes: "B2B partner subscriber engine",
  },
  {
    name: "Motivation Engine",
    prefix: "mt-",
    dbName: "motivation_engine",
    dbType: "PostgreSQL",
    host: "mt-postgres",
    port: 8082,
    url: "https://motivation.life-expat.com",
    vpsPath: "/opt/engine-motivation/",
    containers: ["mt-app", "mt-postgres", "mt-redis", "mt-nginx", "mt-scheduler", "mt-worker", "mt-worker-whatsapp", "mt-worker-telegram"],
    status: "live",
    notes: "Sequences motivation multicanal (email, WhatsApp, Telegram)",
  },
  {
    name: "WhatsApp Campaigns",
    prefix: "wc-",
    dbName: "whatsapp_campaigns",
    dbType: "MySQL",
    host: "wc-mysql",
    port: 8094,
    url: "https://whatsapp.life-expat.com",
    vpsPath: "/opt/whatsapp-campaigns/",
    containers: ["wc-app", "wc-mysql", "wc-redis", "wc-nginx-api", "wc-frontend", "wc-queue", "wc-scheduler", "wc-baileys"],
    status: "live",
    notes: "Campagnes WhatsApp multilingues via Baileys",
  },
  {
    name: "Conversion Engine",
    prefix: "conversion-",
    dbName: "conversion_engine",
    dbType: "PostgreSQL",
    host: "conversion-postgres",
    port: 8096,
    url: "https://conversion.life-expat.com",
    vpsPath: "/opt/conversion-engine/",
    containers: ["conversion-app", "conversion-postgres", "conversion-redis", "conversion-queue", "conversion-scheduler"],
    status: "live",
    notes: "Import prospects emploi, sequences email, conversion chatters",
  },
  {
    name: "App Surveillance",
    prefix: "as-",
    dbName: "app_surveillance",
    dbType: "PostgreSQL",
    host: "as-postgres",
    port: 8097,
    url: "https://apps.life-expat.com",
    vpsPath: "/opt/app-surveillance/",
    containers: ["as-app", "as-postgres", "as-redis", "as-nginx", "as-queue", "as-scheduler", "as-gp-scraper"],
    status: "live",
    notes: "Veille apps iOS/Android/Web, scores IA, buzz detection",
  },
  {
    name: "Blog SOS-Expat",
    prefix: "blog-",
    dbName: "blog_sos_expat",
    dbType: "PostgreSQL",
    host: "blog-postgres",
    port: 8084,
    url: "(pas encore de domaine)",
    vpsPath: "/opt/blog-sos-expat/",
    containers: ["blog-app", "blog-postgres", "blog-redis", "blog-nginx", "blog-queue", "blog-scheduler"],
    status: "live",
    notes: "Blog SEO Laravel SSR, articles multilingues",
  },
  {
    name: "Trustpilot Members",
    prefix: "tp-",
    dbName: "trustpilot_sos_expat",
    dbType: "MySQL",
    host: "tp-mysql",
    port: 8092,
    url: "https://trustpilot.life-expat.com",
    vpsPath: "/opt/trustpilot-members/",
    containers: [],
    status: "live",
    notes: "Gestion membres Trustpilot",
  },
];

const dbTypeColors: Record<string, string> = {
  PostgreSQL: "bg-blue-100 text-blue-800",
  MySQL: "bg-orange-100 text-orange-800",
  Firestore: "bg-yellow-100 text-yellow-800",
};

const VPS_IP = "95.216.179.163";

export default function AdminDatabases() {
  const pgCount = projects.filter((p) => p.dbType === "PostgreSQL").length;
  const mysqlCount = projects.filter((p) => p.dbType === "MySQL").length;
  const totalContainers = projects.reduce((acc, p) => acc + p.containers.length, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Infrastructure & Bases de donnees</h1>
        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{projects.length}</div>
            <div className="text-sm text-gray-500">Projets</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{pgCount}</div>
            <div className="text-sm text-gray-500">PostgreSQL</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{mysqlCount}</div>
            <div className="text-sm text-gray-500">MySQL</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">1</div>
            <div className="text-sm text-gray-500">Firestore</div>
          </div>
          <div className="bg-white rounded-lg border p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{totalContainers}</div>
            <div className="text-sm text-gray-500">Containers</div>
          </div>
        </div>

        {/* VPS info */}
        <div className="bg-gray-900 text-white rounded-lg p-4 flex items-center gap-3">
          <Server className="h-5 w-5 text-green-400 shrink-0" />
          <div>
            <span className="font-semibold">VPS Hetzner</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="font-mono text-sm">{VPS_IP}</span>
            <span className="mx-2 text-gray-400">|</span>
            <span className="text-sm text-gray-300">Tous les projets Laravel (sauf SOS-Expat principal = Firebase)</span>
          </div>
        </div>

        {/* Projects grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <div
              key={project.name}
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{project.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{project.notes}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 ${
                      project.status === "live"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    <CheckCircle className="h-3 w-3" />
                    {project.status === "live" ? "Live" : "Deprecated"}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  {/* DB info */}
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="font-mono text-gray-700">{project.dbName}</span>
                    <span
                      className={`text-xs font-medium rounded px-1.5 py-0.5 ${dbTypeColors[project.dbType]}`}
                    >
                      {project.dbType}
                    </span>
                  </div>

                  {/* Host */}
                  {project.host !== "Firebase Cloud" && (
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-gray-600">
                        Container: <span className="font-mono">{project.host}</span>
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-600">
                        Prefix: <span className="font-mono">{project.prefix}</span>
                      </span>
                    </div>
                  )}

                  {/* VPS path */}
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="font-mono text-gray-600 text-xs">{project.vpsPath}</span>
                  </div>

                  {/* URL */}
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400 shrink-0" />
                    {project.url.startsWith("http") ? (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {project.url.replace("https://", "")}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">{project.url}</span>
                    )}
                  </div>

                  {/* Containers count */}
                  {project.containers.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex flex-wrap gap-1">
                        {project.containers.map((c) => (
                          <span
                            key={c}
                            className="inline-block text-xs font-mono bg-gray-100 text-gray-600 rounded px-1.5 py-0.5"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
