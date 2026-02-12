import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-bold text-telegram-500 mb-4">404</p>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {t("common.notFound")}
        </h1>
        <p className="text-gray-500 mb-6">{t("common.notFoundDesc")}</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600"
        >
          {t("common.goHome")}
        </button>
      </div>
    </div>
  );
}
