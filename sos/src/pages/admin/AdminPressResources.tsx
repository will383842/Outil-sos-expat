import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Edit,
  Trash,
  Download,
  Image,
  FileText,
  File,
  Search,
  Eye,
  EyeOff,
  Upload,
  Newspaper,
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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Modal from "../../components/common/Modal";

// ==================== TYPES ====================

type ResourceType = "logo" | "image" | "banner" | "screenshot" | "document" | "other";
type ResourceCategory = "brand" | "product" | "team";

interface PressResource {
  id: string;
  type: ResourceType;
  title: string;
  description: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  category: ResourceCategory;
  format: string;
  dimensions?: string;
  isActive: boolean;
  sortOrder: number;
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface FormData {
  title: string;
  description: string;
  type: ResourceType;
  category: ResourceCategory;
  format: string;
  dimensions: string;
  isActive: boolean;
  sortOrder: number;
}

// ==================== CONSTANTS ====================

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: "logo", label: "Logo" },
  { value: "image", label: "Image" },
  { value: "banner", label: "Banner" },
  { value: "screenshot", label: "Screenshot" },
  { value: "document", label: "Document" },
  { value: "other", label: "Other" },
];

const RESOURCE_CATEGORIES: { value: ResourceCategory; label: string }[] = [
  { value: "brand", label: "Brand" },
  { value: "product", label: "Product" },
  { value: "team", label: "Team" },
];

// ==================== HELPERS ====================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getResourceIcon(type: string) {
  switch (type) {
    case "logo":
    case "image":
    case "banner":
    case "screenshot":
      return Image;
    case "document":
      return FileText;
    default:
      return File;
  }
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

const emptyFormData: FormData = {
  title: "",
  description: "",
  type: "logo",
  category: "brand",
  format: "",
  dimensions: "",
  isActive: true,
  sortOrder: 0,
};

// ==================== COMPONENT ====================

const AdminPressResources: React.FC = () => {
  const [resources, setResources] = useState<PressResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean; id: string | null }>({ show: false, id: null });
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedResource, setSelectedResource] = useState<PressResource | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyFormData);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ResourceType | "all">("all");
  const [filterCategory, setFilterCategory] = useState<ResourceCategory | "all">("all");

  // ==================== LOAD DATA ====================

  const loadResources = useCallback(async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, "press_resources"), orderBy("sortOrder", "asc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || new Date(),
      })) as PressResource[];
      setResources(data);
    } catch (error) {
      console.error("Error loading press resources:", error);
      toast.error("Erreur lors du chargement des ressources");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // ==================== HANDLERS ====================

  const handleCreate = () => {
    setIsCreating(true);
    setSelectedResource(null);
    setFormData(emptyFormData);
    setFileToUpload(null);
    setShowModal(true);
  };

  const handleEdit = (resource: PressResource) => {
    setIsCreating(false);
    setSelectedResource(resource);
    setFormData({
      title: resource.title,
      description: resource.description,
      type: resource.type,
      category: resource.category,
      format: resource.format,
      dimensions: resource.dimensions || "",
      isActive: resource.isActive,
      sortOrder: resource.sortOrder,
    });
    setFileToUpload(null);
    setShowModal(true);
  };

  const handleToggleActive = async (resource: PressResource) => {
    try {
      await updateDoc(doc(db, "press_resources", resource.id), {
        isActive: !resource.isActive,
        updatedAt: serverTimestamp(),
      });
      setResources((prev) =>
        prev.map((r) =>
          r.id === resource.id ? { ...r, isActive: !r.isActive } : r
        )
      );
      toast.success(resource.isActive ? "Ressource désactivée" : "Ressource activée");
    } catch (error) {
      console.error("Error toggling resource:", error);
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm.id) return;
    try {
      await deleteDoc(doc(db, "press_resources", showDeleteConfirm.id));
      setResources((prev) => prev.filter((r) => r.id !== showDeleteConfirm.id));
      toast.success("Ressource supprimée");
      setShowDeleteConfirm({ show: false, id: null });
    } catch (error) {
      console.error("Error deleting resource:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Le titre est requis");
      return;
    }
    if (isCreating && !fileToUpload) {
      toast.error("Un fichier est requis");
      return;
    }

    try {
      setIsSaving(true);
      let fileUrl = selectedResource?.fileUrl || "";
      let fileName = selectedResource?.fileName || "";
      let fileSize = selectedResource?.fileSize || 0;
      let mimeType = selectedResource?.mimeType || "";

      // Upload file if provided
      if (fileToUpload) {
        const timestamp = Date.now();
        const storagePath = `press/resources/${timestamp}_${fileToUpload.name}`;
        const storageRef = ref(storage, storagePath);
        const snapshot = await uploadBytes(storageRef, fileToUpload);
        fileUrl = await getDownloadURL(snapshot.ref);
        fileName = fileToUpload.name;
        fileSize = fileToUpload.size;
        mimeType = fileToUpload.type;
      }

      const docData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        type: formData.type,
        category: formData.category,
        format: formData.format.trim().toUpperCase() || fileName.split(".").pop()?.toUpperCase() || "",
        dimensions: formData.dimensions.trim() || null,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
        fileName,
        fileUrl,
        fileSize,
        mimeType,
        updatedAt: serverTimestamp(),
      };

      if (isCreating) {
        await addDoc(collection(db, "press_resources"), {
          ...docData,
          downloadCount: 0,
          createdAt: serverTimestamp(),
        });
        toast.success("Ressource créée");
      } else if (selectedResource) {
        await updateDoc(doc(db, "press_resources", selectedResource.id), docData);
        toast.success("Ressource mise à jour");
      }

      setShowModal(false);
      loadResources();
    } catch (error) {
      console.error("Error saving resource:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  // ==================== FILTERED DATA ====================

  const filteredResources = resources.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    if (searchQuery && !r.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // ==================== RENDER ====================

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-red-600" />
              Ressources Presse
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {resources.length} ressource{resources.length !== 1 ? "s" : ""} ({resources.filter((r) => r.isActive).length} active{resources.filter((r) => r.isActive).length !== 1 ? "s" : ""})
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter une ressource
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ResourceType | "all")}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Tous les types</option>
            {RESOURCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ResourceCategory | "all")}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Toutes les catégories</option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Image className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucune ressource trouvée</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aperçu</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Titre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taille</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResources.map((resource) => {
                    const IconComp = getResourceIcon(resource.type);
                    return (
                      <tr key={resource.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                            {isImageMime(resource.mimeType) ? (
                              <img
                                src={resource.fileUrl}
                                alt={resource.title}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <IconComp className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{resource.title}</div>
                          <div className="text-xs text-gray-400">{resource.fileName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md capitalize">
                            {resource.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-red-50 text-red-600 text-xs rounded-md capitalize">
                            {resource.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div>{formatFileSize(resource.fileSize)}</div>
                          {resource.format && (
                            <div className="text-xs text-gray-400">{resource.format}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{resource.sortOrder}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(resource)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                              resource.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {resource.isActive ? (
                              <><Eye className="w-3 h-3" /> Actif</>
                            ) : (
                              <><EyeOff className="w-3 h-3" /> Inactif</>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <a
                              href={resource.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Télécharger"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleEdit(resource)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Modifier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm({ show: true, id: resource.id })}
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
        title={isCreating ? "Ajouter une ressource" : "Modifier la ressource"}
        size="large"
      >
        <div className="space-y-4">
          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fichier {isCreating && <span className="text-red-500">*</span>}
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-red-300 transition-colors">
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFileToUpload(file);
                    if (!formData.format) {
                      setFormData((prev) => ({
                        ...prev,
                        format: file.name.split(".").pop()?.toUpperCase() || "",
                      }));
                    }
                  }
                }}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.svg,.eps,.ai"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                {fileToUpload ? (
                  <p className="text-sm text-green-600 font-medium">{fileToUpload.name} ({formatFileSize(fileToUpload.size)})</p>
                ) : selectedResource ? (
                  <p className="text-sm text-gray-500">
                    Fichier actuel : <span className="font-medium">{selectedResource.fileName}</span> — Cliquer pour remplacer
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Cliquer pour sélectionner un fichier</p>
                )}
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Ex: Logo SOS-Expat HD"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows={2}
              placeholder="Description optionnelle pour les journalistes"
            />
          </div>

          {/* Type + Category row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as ResourceType }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as ResourceCategory }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {RESOURCE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Format + Dimensions + SortOrder */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
              <input
                type="text"
                value={formData.format}
                onChange={(e) => setFormData((prev) => ({ ...prev, format: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="PNG, SVG, PDF..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
              <input
                type="text"
                value={formData.dimensions}
                onChange={(e) => setFormData((prev) => ({ ...prev, dimensions: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="1200x630"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">
              Actif (visible sur la page presse)
            </label>
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
            Êtes-vous sûr de vouloir supprimer cette ressource ? Cette action est irréversible.
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

export default AdminPressResources;
