/**
 * AdminChatterPromotions
 *
 * Admin page for managing chatter promotions/hackathons.
 * CRUD operations for promotions with multipliers.
 */

import React, { useState, useEffect, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  Zap,
  Plus,
  Edit,
  Trash2,
  Copy,
  Calendar,
  Globe,
  AlertTriangle,
  Trophy,
} from "lucide-react";
import AdminLayout from '../../../components/admin/AdminLayout';

interface ChatterPromotion {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  type: "referral" | "recruitment" | "all";
  countryFilter: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  participantsCount?: number;
  totalBonusGenerated?: number;
}

interface PromotionFormData {
  name: string;
  description: string;
  multiplier: number;
  type: "referral" | "recruitment" | "all";
  countryFilter: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const defaultFormData: PromotionFormData = {
  name: "",
  description: "",
  multiplier: 2,
  type: "all",
  countryFilter: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

const AdminChatterPromotions: React.FC = () => {
  const [promotions, setPromotions] = useState<ChatterPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<ChatterPromotion | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const functions = getFunctions(undefined, "europe-west1");

  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const getPromosFn = httpsCallable<
        { includeInactive?: boolean },
        { promotions: ChatterPromotion[] }
      >(functions, "adminGetPromotions");

      const result = await getPromosFn({ includeInactive: true });
      setPromotions(result.data.promotions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch promotions");
    } finally {
      setIsLoading(false);
    }
  }, [functions]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleOpenDialog = (promo?: ChatterPromotion) => {
    if (promo) {
      setEditingPromo(promo);
      setFormData({
        name: promo.name,
        description: promo.description,
        multiplier: promo.multiplier,
        type: promo.type,
        countryFilter: promo.countryFilter || "",
        startDate: promo.startDate.split("T")[0],
        endDate: promo.endDate.split("T")[0],
        isActive: promo.isActive,
      });
    } else {
      setEditingPromo(null);
      setFormData(defaultFormData);
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (editingPromo) {
        const updateFn = httpsCallable<
          { id: string; updates: Partial<PromotionFormData> },
          { success: boolean }
        >(functions, "adminUpdatePromotion");

        await updateFn({
          id: editingPromo.id,
          updates: {
            ...formData,
            countryFilter: formData.countryFilter || undefined,
          },
        });
      } else {
        const createFn = httpsCallable<
          Omit<PromotionFormData, "countryFilter"> & { countryFilter: string | null },
          { success: boolean; promoId: string }
        >(functions, "adminCreatePromotion");

        await createFn({
          ...formData,
          countryFilter: formData.countryFilter || null,
        });
      }

      setIsDialogOpen(false);
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save promotion");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (promoId: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;

    setIsDeleting(promoId);
    try {
      const deleteFn = httpsCallable<{ id: string }, { success: boolean }>(
        functions,
        "adminDeletePromotion"
      );

      await deleteFn({ id: promoId });
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete promotion");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDuplicate = async (promo: ChatterPromotion) => {
    try {
      const duplicateFn = httpsCallable<{ id: string }, { success: boolean; promoId: string }>(
        functions,
        "adminDuplicatePromotion"
      );

      await duplicateFn({ id: promo.id });
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to duplicate promotion");
    }
  };

  const getStatusBadge = (promo: ChatterPromotion) => {
    const now = new Date();
    const start = new Date(promo.startDate);
    const end = new Date(promo.endDate);

    if (!promo.isActive) {
      return <Badge variant="secondary">Inactif</Badge>;
    }
    if (now < start) {
      return <Badge className="bg-blue-500">Planifié</Badge>;
    }
    if (now > end) {
      return <Badge variant="destructive">Terminé</Badge>;
    }
    return <Badge className="bg-green-500">En cours</Badge>;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "referral":
        return <Badge variant="outline">Parrainage</Badge>;
      case "recruitment":
        return <Badge variant="outline">Recrutement</Badge>;
      default:
        return <Badge variant="outline">Tous</Badge>;
    }
  };

  // Calculate stats
  const activePromos = promotions.filter((p) => {
    const now = new Date();
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return p.isActive && now >= start && now <= end;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-7 w-7 text-purple-500" />
              Promotions & Hackathons
            </h1>
            <p className="text-gray-500 mt-1">
              Gérer les multiplicateurs et événements spéciaux
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchPromotions} variant="outline" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle promotion
            </Button>
          </div>
        </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Promotions actives</p>
                <p className="text-2xl font-bold">{activePromos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total promotions</p>
                <p className="text-2xl font-bold">{promotions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Meilleur multiplicateur</p>
                <p className="text-2xl font-bold">
                  x{Math.max(...activePromos.map((p) => p.multiplier), 1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Promotions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des promotions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : promotions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucune promotion créée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Multiplicateur</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{promo.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">
                          {promo.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-purple-500 text-white">
                        x{promo.multiplier}
                      </Badge>
                    </TableCell>
                    <TableCell>{getTypeBadge(promo.type)}</TableCell>
                    <TableCell>
                      {promo.countryFilter ? (
                        <Badge variant="outline">
                          <Globe className="w-3 h-3 mr-1" />
                          {promo.countryFilter}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">Tous</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{new Date(promo.startDate).toLocaleDateString()}</p>
                        <p className="text-gray-500">
                          au {new Date(promo.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(promo)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(promo)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(promo)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(promo.id)}
                          disabled={isDeleting === promo.id}
                        >
                          {isDeleting === promo.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPromo ? "Modifier la promotion" : "Nouvelle promotion"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nom</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Hackathon Janvier"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Double vos commissions de parrainage..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Multiplicateur</Label>
                <Select
                  value={formData.multiplier.toString()}
                  onValueChange={(val) =>
                    setFormData({ ...formData, multiplier: parseFloat(val) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1.5">x1.5</SelectItem>
                    <SelectItem value="2">x2</SelectItem>
                    <SelectItem value="2.5">x2.5</SelectItem>
                    <SelectItem value="3">x3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: string) =>
                    setFormData({ ...formData, type: val as "referral" | "recruitment" | "all" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="referral">Parrainage</SelectItem>
                    <SelectItem value="recruitment">Recrutement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Pays (optionnel)</Label>
              <Input
                value={formData.countryFilter}
                onChange={(e) =>
                  setFormData({ ...formData, countryFilter: e.target.value.toUpperCase() })
                }
                placeholder="SN, CI, FR..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Laisser vide pour tous les pays
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked: boolean) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingPromo ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
};

export default AdminChatterPromotions;
