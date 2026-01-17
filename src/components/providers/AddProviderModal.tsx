/**
 * =============================================================================
 * ADD PROVIDER MODAL - Modal d'ajout d'un prestataire
 * =============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Plus, X, Scale, Globe, Mail, User, MapPin } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface AddProviderData {
  email: string;
  name: string;
  type: "lawyer" | "expat";
  country: string;
}

export interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: AddProviderData) => Promise<void>;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AddProviderModal({
  isOpen,
  onClose,
  onAdd,
}: AddProviderModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"lawyer" | "expat">("lawyer");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setName("");
      setType("lawyer");
      setCountry("");
      setError(null);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email.trim()) {
      setError("L'email est requis");
      return;
    }
    if (!name.trim()) {
      setError("Le nom est requis");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Format d'email invalide");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAdd({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        type,
        country: country.trim(),
      });
      handleClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors de l'ajout";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-2xl shadow-xl max-w-md w-full transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            Ajouter un prestataire
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Google <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="avocat@gmail.com"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                required
                disabled={loading}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Le prestataire se connectera avec ce compte Google
            </p>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maitre Dupont"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de prestataire
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("lawyer")}
                disabled={loading}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  type === "lawyer"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                } disabled:opacity-50`}
              >
                <Scale className="w-5 h-5" />
                <span className="font-medium">Avocat</span>
              </button>
              <button
                type="button"
                onClick={() => setType("expat")}
                disabled={loading}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  type === "expat"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 hover:border-gray-300 text-gray-600"
                } disabled:opacity-50`}
              >
                <Globe className="w-5 h-5" />
                <span className="font-medium">Expatrie</span>
              </button>
            </div>
          </div>

          {/* Pays */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pays
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="France"
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                disabled={loading}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ajout...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Ajouter
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddProviderModal;
