import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Edit,
  Trash,
  Newspaper,
  Calendar,
  Eye,
  EyeOff,
  Copy,
  Globe,
  Check,
} from "lucide-react";
import {
  collection,
  query,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";

// ==================== TYPES ====================

type SupportedLanguage = "fr" | "en" | "es" | "de" | "pt" | "ru" | "ch" | "hi" | "ar";

interface PressRelease {
  id: string;
  title: Record<string, string>;
  summary: Record<string, string>;
  content: Record<string, string>;
  slug: Record<string, string>;
  publishedAt: Date;
  isActive: boolean;
  imageUrl?: string;
  pdfUrl?: Record<string, string>;
  htmlUrl?: Record<string, string>;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface FormData {
  title: Record<string, string>;
  summary: Record<string, string>;
  content: Record<string, string>;
  publishedAt: string;
  isActive: boolean;
  imageUrl: string;
  pdfUrl: Record<string, string>;
  htmlUrl: Record<string, string>;
  tags: string;
}

// ==================== CONSTANTS ====================

const LANGUAGES: { code: SupportedLanguage; label: string; flag: string }[] = [
  { code: "fr", label: "Français", flag: "\u{1F1EB}\u{1F1F7}" },
  { code: "en", label: "English", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "es", label: "Español", flag: "\u{1F1EA}\u{1F1F8}" },
  { code: "de", label: "Deutsch", flag: "\u{1F1E9}\u{1F1EA}" },
  { code: "pt", label: "Português", flag: "\u{1F1F5}\u{1F1F9}" },
  { code: "ru", label: "Русский", flag: "\u{1F1F7}\u{1F1FA}" },
  { code: "ch", label: "中文", flag: "\u{1F1E8}\u{1F1F3}" },
  { code: "hi", label: "हिन्दी", flag: "\u{1F1EE}\u{1F1F3}" },
  { code: "ar", label: "العربية", flag: "\u{1F1F8}\u{1F1E6}" },
];

const NON_LATIN_LANGS = new Set(["ru", "ch", "hi", "ar"]);

function slugifyLatin(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function slugifyForLang(text: string, langCode: string, allTitles: Record<string, string>): string {
  if (!NON_LATIN_LANGS.has(langCode)) {
    return slugifyLatin(text);
  }
  // For non-latin languages: use {langCode}-{english-slug} pattern
  const englishTitle = allTitles["en"]?.trim();
  const frenchTitle = allTitles["fr"]?.trim();
  const fallbackTitle = englishTitle || frenchTitle || text;
  const baseSlug = slugifyLatin(fallbackTitle);
  return baseSlug ? `${langCode}-${baseSlug}` : langCode;
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

const emptyMultilingual = (): Record<string, string> =>
  Object.fromEntries(LANGUAGES.map((l) => [l.code, ""]));

const emptyFormData = (): FormData => ({
  title: emptyMultilingual(),
  summary: emptyMultilingual(),
  content: emptyMultilingual(),
  publishedAt: formatDateForInput(new Date()),
  isActive: true,
  imageUrl: "",
  pdfUrl: emptyMultilingual(),
  htmlUrl: emptyMultilingual(),
  tags: "",
});

// ==================== COMPONENT ====================

const AdminGroupAdminReleases: React.FC = () => {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<PressRelease | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData());
  const [activeLang, setActiveLang] = useState<SupportedLanguage>("fr");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<Record<string, File | null>>({});
  const [htmlFiles, setHtmlFiles] = useState<Record<string, File | null>>({});

  // ==================== LOAD DATA ====================

  const loadReleases = useCallback(async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, "group_admin_releases"), orderBy("publishedAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          publishedAt: raw.publishedAt?.toDate() || new Date(),
          createdAt: raw.createdAt?.toDate() || new Date(),
          updatedAt: raw.updatedAt?.toDate() || new Date(),
        };
      }) as PressRelease[];
      setReleases(data);
    } catch (error) {
      console.error("Error loading press releases:", error);
      toast.error("Erreur lors du chargement des communiqués");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  // ==================== HANDLERS ====================

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedRelease(null);
    setFormData(emptyFormData());
    setActiveLang("fr");
    setImageFile(null);
    setPdfFiles({});
    setHtmlFiles({});
    setShowModal(true);
  };

  const handleEdit = (release: PressRelease) => {
    setIsCreating(false);
    setSelectedRelease(release);
    setFormData({
      title: { ...emptyMultilingual(), ...release.title },
      summary: { ...emptyMultilingual(), ...release.summary },
      content: { ...emptyMultilingual(), ...release.content },
      publishedAt: formatDateForInput(release.publishedAt),
      isActive: release.isActive,
      imageUrl: release.imageUrl || "",
      pdfUrl: { ...emptyMultilingual(), ...(release.pdfUrl || {}) },
      htmlUrl: { ...emptyMultilingual(), ...(release.htmlUrl || {}) },
      tags: release.tags?.join(", ") || "",
    });
    setActiveLang("fr");
    setImageFile(null);
    setPdfFiles({});
    setHtmlFiles({});
    setShowModal(true);
  };

  const handleToggleActive = async (release: PressRelease) => {
    try {
      await updateDoc(doc(db, "group_admin_releases", release.id), {
        isActive: !release.isActive,
        updatedAt: serverTimestamp(),
      });
      setReleases((prev) =>
        prev.map((r) =>
          r.id === release.id ? { ...r, isActive: !r.isActive } : r
        )
      );
      toast.success(release.isActive ? "Communiqué désactivé" : "Communiqué activé");
    } catch (error) {
      console.error("Error toggling release:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm.id) return;
    try {
      await deleteDoc(doc(db, "group_admin_releases", showDeleteConfirm.id));
      setReleases((prev) => prev.filter((r) => r.id !== showDeleteConfirm.id));
      toast.success("Communiqué supprimé");
      setShowDeleteConfirm({ show: false, id: null });
    } catch (error) {
      console.error("Error deleting release:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleCopyToLang = (targetLang: SupportedLanguage) => {
    setFormData((prev) => ({
      ...prev,
      title: { ...prev.title, [targetLang]: prev.title[activeLang] || "" },
      summary: { ...prev.summary, [targetLang]: prev.summary[activeLang] || "" },
      content: { ...prev.content, [targetLang]: prev.content[activeLang] || "" },
    }));
    toast.success(`Contenu copié vers ${LANGUAGES.find((l) => l.code === targetLang)?.label}`);
  };

  const handleSave = async () => {
    // Validate at least one language has title
    const hasTitle = Object.values(formData.title).some((v) => v.trim());
    if (!hasTitle) {
      toast.error("Au moins un titre est requis");
      return;
    }

    try {
      setIsSaving(true);

      // Generate slugs from titles (non-latin langs use {lang}-{english-slug})
      const slug: Record<string, string> = {};
      for (const [langCode, title] of Object.entries(formData.title)) {
        if (title.trim()) {
          slug[langCode] = slugifyForLang(title, langCode, formData.title);
        }
      }

      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const baseDocData = {
        title: formData.title,
        summary: formData.summary,
        content: formData.content,
        slug,
        publishedAt: Timestamp.fromDate(new Date(formData.publishedAt)),
        isActive: formData.isActive,
        imageUrl: formData.imageUrl || null,
        pdfUrl: { ...formData.pdfUrl },
        htmlUrl: { ...formData.htmlUrl },
        tags: tagsArray,
        updatedAt: serverTimestamp(),
      };

      // For new documents, create first to get the real ID
      let docId: string;
      if (isCreating) {
        const newDocRef = await addDoc(collection(db, "group_admin_releases"), {
          ...baseDocData,
          createdAt: serverTimestamp(),
        });
        docId = newDocRef.id;
      } else {
        docId = selectedRelease!.id;
      }

      // Upload image if provided (now with real docId)
      let imageUrl = baseDocData.imageUrl as string;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const storagePath = `group_admin/releases/${docId}/image.${ext}`;
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      // Upload PDFs if provided (now with real docId)
      const pdfUrl = { ...baseDocData.pdfUrl } as Record<string, string>;
      for (const [langCode, file] of Object.entries(pdfFiles)) {
        if (file) {
          const storagePath = `group_admin/releases/${docId}/pdfs/${langCode}.pdf`;
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadBytes(storageRef, file);
          pdfUrl[langCode] = await getDownloadURL(snapshot.ref);
        }
      }

      // Upload HTML files if provided (standalone HTML communiqués)
      const htmlUrl = { ...baseDocData.htmlUrl } as Record<string, string>;
      for (const [langCode, file] of Object.entries(htmlFiles)) {
        if (file) {
          const storagePath = `group_admin/releases/${docId}/html/${langCode}.html`;
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadBytes(storageRef, file, { contentType: "text/html; charset=utf-8" });
          htmlUrl[langCode] = await getDownloadURL(snapshot.ref);
        }
      }

      // Update document with file URLs if any uploads happened
      const hasUploads = imageFile || Object.values(pdfFiles).some(Boolean) || Object.values(htmlFiles).some(Boolean);
      if (hasUploads || !isCreating) {
        await updateDoc(doc(db, "group_admin_releases", docId), {
          ...(isCreating ? {} : baseDocData),
          imageUrl: imageUrl || null,
          pdfUrl,
          htmlUrl,
          updatedAt: serverTimestamp(),
        });
      }

      toast.success(isCreating ? "Communiqué créé" : "Communiqué mis à jour");
      setShowModal(false);
      loadReleases();
    } catch (error) {
      console.error("Error saving release:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== HELPERS ====================

  const getCompletedLangs = (release: PressRelease): SupportedLanguage[] => {
    return LANGUAGES.filter((l) => release.title?.[l.code]?.trim()).map((l) => l.code);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  // ==================== RENDER ====================

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-red-600" />
              Communiqués AdminGroupe
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {releases.length} communiqué{releases.length !== 1 ? "s" : ""} ({releases.filter((r) => r.isActive).length} actif{releases.filter((r) => r.isActive).length !== 1 ? "s" : ""})
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nouveau communiqué
          </button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
          </div>
        ) : releases.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun communiqué admingroupe</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Langues</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tags</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {releases.map((release) => {
                    const completedLangs = getCompletedLangs(release);
                    const title = release.title?.fr || release.title?.en || Object.values(release.title || {})[0] || "Sans titre";

                    return (
                      <tr key={release.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {release.imageUrl && (
                              <img
                                src={release.imageUrl}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 line-clamp-1">{title}</div>
                              {release.summary?.fr && (
                                <div className="text-xs text-gray-400 line-clamp-1">{release.summary.fr}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(release.publishedAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {LANGUAGES.map((lang) => (
                              <span
                                key={lang.code}
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  completedLangs.includes(lang.code)
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-400"
                                }`}
                                title={lang.label}
                              >
                                {lang.flag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {release.tags?.slice(0, 3).map((tag) => (
                              <span key={tag} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full">
                                {tag}
                              </span>
                            ))}
                            {(release.tags?.length || 0) > 3 && (
                              <span className="text-xs text-gray-400">+{release.tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(release)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                              release.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {release.isActive ? (
                              <><Eye className="w-3 h-3" /> Actif</>
                            ) : (
                              <><EyeOff className="w-3 h-3" /> Inactif</>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(release)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ show: true, id: release.id })}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Supprimer"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ==================== CREATE/EDIT MODAL ==================== */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={isCreating ? "Nouveau communiqué admingroupe" : "Modifier le communiqué"}
        size="large"
      >
        <div className="space-y-5">
          {/* Language tabs */}
          <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-1">
            {LANGUAGES.map((lang) => {
              const hasContent = formData.title[lang.code]?.trim();
              return (
                <button
                  key={lang.code}
                  onClick={() => setActiveLang(lang.code)}
                  className={`relative px-3 py-2 text-sm rounded-t-lg transition-colors ${
                    activeLang === lang.code
                      ? "bg-red-50 text-red-700 font-medium border-b-2 border-red-600"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <span className="mr-1">{lang.flag}</span>
                  <span className="hidden sm:inline">{lang.code.toUpperCase()}</span>
                  {hasContent && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Copy to other language */}
          {formData.title[activeLang]?.trim() && (
            <div className="flex items-center gap-2 text-xs">
              <Copy className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-400">Copier vers :</span>
              {LANGUAGES.filter((l) => l.code !== activeLang).map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleCopyToLang(lang.code)}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  {lang.flag} {lang.code.toUpperCase()}
                </button>
              ))}
            </div>
          )}

          {/* Title per language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre ({LANGUAGES.find((l) => l.code === activeLang)?.label})
            </label>
            <input
              type="text"
              value={formData.title[activeLang] || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  title: { ...prev.title, [activeLang]: e.target.value },
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Titre du communiqué..."
            />
          </div>

          {/* Summary per language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Résumé ({LANGUAGES.find((l) => l.code === activeLang)?.label})
            </label>
            <textarea
              value={formData.summary[activeLang] || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  summary: { ...prev.summary, [activeLang]: e.target.value },
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={2}
              placeholder="Résumé court..."
            />
          </div>

          {/* Content per language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenu ({LANGUAGES.find((l) => l.code === activeLang)?.label})
            </label>
            <textarea
              value={formData.content[activeLang] || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  content: { ...prev.content, [activeLang]: e.target.value },
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={8}
              placeholder="Contenu complet du communiqué..."
            />
          </div>

          {/* PDF upload per language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PDF ({LANGUAGES.find((l) => l.code === activeLang)?.label})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPdfFiles((prev) => ({ ...prev, [activeLang]: file }));
                  }
                }}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-600 hover:file:bg-red-100"
              />
              {(pdfFiles[activeLang] || formData.pdfUrl[activeLang]) && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
            {formData.pdfUrl[activeLang] && !pdfFiles[activeLang] && (
              <p className="text-xs text-gray-400 mt-1">
                PDF existant —{" "}
                <a href={formData.pdfUrl[activeLang]} target="_blank" rel="noopener noreferrer" className="text-red-600 underline">Voir</a>
              </p>
            )}
          </div>

          {/* HTML file upload per language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Communiqué HTML complet ({LANGUAGES.find((l) => l.code === activeLang)?.label})
            </label>
            <p className="text-xs text-gray-400 mb-2">Fichier HTML standalone — affiché en pleine page pour les journalistes</p>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".html,.htm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setHtmlFiles((prev) => ({ ...prev, [activeLang]: file }));
                  }
                }}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
              />
              {(htmlFiles[activeLang] || formData.htmlUrl[activeLang]) && (
                <Check className="w-4 h-4 text-green-500" />
              )}
            </div>
            {formData.htmlUrl[activeLang] && !htmlFiles[activeLang] && (
              <p className="text-xs text-gray-400 mt-1">
                HTML existant —{" "}
                <a href={formData.htmlUrl[activeLang]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Aperçu</a>
              </p>
            )}
          </div>

          {/* Separator - Global fields */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Paramètres globaux
            </p>
          </div>

          {/* Date + Tags row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de publication</label>
              <input
                type="date"
                value={formData.publishedAt}
                onChange={(e) => setFormData((prev) => ({ ...prev, publishedAt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="lancement, partenariat, expansion..."
              />
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image à la une</label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setImageFile(file);
                }}
                className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-600 hover:file:bg-red-100"
              />
              {(imageFile || formData.imageUrl) && (
                <img
                  src={imageFile ? URL.createObjectURL(imageFile) : formData.imageUrl}
                  alt="Preview"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveRelease"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="isActiveRelease" className="text-sm text-gray-700">
              Actif (visible sur la page admin groupes)
            </label>
          </div>

          {/* Language completeness indicator */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-2">Complétude linguistique :</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => {
                const hasTitle = formData.title[lang.code]?.trim();
                const hasSummary = formData.summary[lang.code]?.trim();
                const hasContent = formData.content[lang.code]?.trim();
                const hasPdf = formData.pdfUrl[lang.code]?.trim() || pdfFiles[lang.code];
                const hasHtml = formData.htmlUrl[lang.code]?.trim() || htmlFiles[lang.code];
                const complete = hasTitle && hasSummary && hasContent && hasPdf && hasHtml;
                const partial = hasTitle || hasSummary || hasContent;
                return (
                  <span
                    key={lang.code}
                    className={`px-2 py-1 text-xs rounded-md ${
                      complete
                        ? "bg-green-100 text-green-700"
                        : partial
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-200 text-gray-400"
                    }`}
                    title={`${lang.label}: texte${hasTitle ? "✓" : "✗"} / résumé${hasSummary ? "✓" : "✗"} / contenu${hasContent ? "✓" : "✗"} / PDF${hasPdf ? "✓" : "✗"} / HTML${hasHtml ? "✓" : "✗"}`}
                  >
                    {lang.flag} {complete ? "✓" : partial ? "…" : "-"}
                    {hasPdf && <span className="ml-0.5 text-[9px] text-blue-500">P</span>}
                    {hasHtml && <span className="ml-0.5 text-[9px] text-purple-500">H</span>}
                  </span>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">✓ texte complet · P = PDF · H = HTML</p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : null}
              {isCreating ? "Créer" : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== DELETE CONFIRMATION ==================== */}
      <Modal
        isOpen={showDeleteConfirm.show}
        onClose={() => setShowDeleteConfirm({ show: false, id: null })}
        title="Confirmer la suppression"
        size="small"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce communiqué ? Cette action est irréversible.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm({ show: false, id: null })}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
            >
              Supprimer
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default AdminGroupAdminReleases;
