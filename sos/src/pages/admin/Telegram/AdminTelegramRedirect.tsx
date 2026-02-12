import React from "react";
import AdminLayout from "../../../components/admin/AdminLayout";
import { ExternalLink, MessageCircle } from "lucide-react";

const TELEGRAM_ENGINE_URL = "https://telegram.sos-expat.com";

const AdminTelegramRedirect: React.FC = () => {
  return (
    <AdminLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-6">
            <MessageCircle className="h-8 w-8 text-sky-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Telegram Marketing Engine
          </h1>
          <p className="text-gray-500 mb-6">
            The Telegram marketing tool has moved to its own dedicated dashboard
            with advanced features: campaigns, segments, automations, A/B tests,
            and more.
          </p>
          <a
            href={TELEGRAM_ENGINE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
          >
            Open Telegram Engine
            <ExternalLink className="h-4 w-4" />
          </a>
          <p className="text-xs text-gray-400 mt-4">
            {TELEGRAM_ENGINE_URL}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramRedirect;
