/**
 * AdminGroupAdminsPromotions
 *
 * Admin page for managing group admin promotions/hackathons.
 * CRUD operations for promotions with multipliers.
 */

import React, { useState, useEffect, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functionsAffiliate } from "@/config/firebase";
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
import AdminLayout from "../../../components/admin/AdminLayout";

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: "hackathon" | "bonus_weekend" | "country_challenge" | "special_event";
  multiplier: number;
  appliesToTypes: string[];
  targetCountries: string[];
  startDate: { _seconds: number } | string;
  endDate: { _seconds: number } | string;
  isActive: boolean;
  maxBudget: number;
  currentSpent: number;
  participantCount: number;
  createdBy: string;
  createdAt: { _seconds: number } | string;
  stats?: {
    totalCommissions: number;
    totalAmount: number;
    uniqueParticipants: number;
    budgetUsedPercent: number;
  };
}

interface FormData {
  name: string;
  description: string;
  type: Promotion["type"];
  multiplier: number;
  appliesToTypes: string[];
  targetCountries: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  maxBudget: number;
}

const COMMISSION_TYPES = [
  { value: "client_referral", label: "Client Referral ($10)" },
  { value: "recruitment", label: "Recruitment ($5)" },
  { value: "manual_adjustment", label: "Manual Adjustment" },
];

const PROMO_TYPES = [
  { value: "hackathon", label: "Hackathon" },
  { value: "bonus_weekend", label: "Bonus Weekend" },
  { value: "country_challenge", label: "Country Challenge" },
  { value: "special_event", label: "Special Event" },
];

const defaultFormData: FormData = {
  name: "",
  description: "",
  type: "hackathon",
  multiplier: 2,
  appliesToTypes: ["client_referral"],
  targetCountries: "",
  startDate: "",
  endDate: "",
  isActive: true,
  maxBudget: 0,
};

function toDate(val: { _seconds: number } | string | undefined): Date {
  if (!val) return new Date();
  if (typeof val === "string") return new Date(val);
  return new Date(val._seconds * 1000);
}

const AdminGroupAdminsPromotions: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchPromotions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functionsAffiliate, "adminGetGroupAdminPromotions");
      const result = await fn({ includeInactive: true });
      setPromotions((result.data as { promotions: Promotion[] }).promotions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur chargement");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleOpenDialog = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      const start = toDate(promo.startDate);
      const end = toDate(promo.endDate);
      setFormData({
        name: promo.name,
        description: promo.description,
        type: promo.type,
        multiplier: promo.multiplier,
        appliesToTypes: promo.appliesToTypes || ["client_referral"],
        targetCountries: (promo.targetCountries || []).join(", "),
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
        isActive: promo.isActive,
        maxBudget: promo.maxBudget || 0,
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
      const countries = formData.targetCountries
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter(Boolean);

      if (editingPromo) {
        const fn = httpsCallable(functionsAffiliate, "adminUpdateGroupAdminPromotion");
        await fn({
          promotionId: editingPromo.id,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          multiplier: formData.multiplier,
          appliesToTypes: formData.appliesToTypes,
          targetCountries: countries,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          isActive: formData.isActive,
          maxBudget: formData.maxBudget,
        });
      } else {
        const fn = httpsCallable(functionsAffiliate, "adminCreateGroupAdminPromotion");
        await fn({
          name: formData.name,
          description: formData.description,
          type: formData.type,
          multiplier: formData.multiplier,
          appliesToTypes: formData.appliesToTypes,
          targetCountries: countries,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          maxBudget: formData.maxBudget,
        });
      }

      setIsDialogOpen(false);
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (promoId: string) => {
    if (!confirm("Supprimer cette promotion ?")) return;
    setIsDeleting(promoId);
    try {
      const fn = httpsCallable(functionsAffiliate, "adminDeleteGroupAdminPromotion");
      await fn({ promotionId: promoId });
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur suppression");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDuplicate = async (promo: Promotion) => {
    try {
      const fn = httpsCallable(functionsAffiliate, "adminDuplicateGroupAdminPromotion");
      await fn({
        promotionId: promo.id,
        newName: `${promo.name} (copie)`,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      await fetchPromotions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur duplication");
    }
  };

  const getStatusBadge = (promo: Promotion) => {
    const now = new Date();
    const start = toDate(promo.startDate);
    const end = toDate(promo.endDate);

    if (!promo.isActive) return <Badge variant="secondary">Inactif</Badge>;
    if (now < start) return <Badge className="bg-blue-500 text-white">Planifié</Badge>;
    if (now > end) return <Badge variant="destructive">Terminé</Badge>;
    return <Badge className="bg-green-500 text-white">En cours</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-teal-600" />
              Promotions GroupAdmins
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Gérer les hackathons et promotions avec multiplicateurs de commissions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPromotions} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
            <Button size="sm" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle promotion
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Promotions ({promotions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              </div>
            ) : promotions.length === 0 ? (
              <p className="text-center text-gray-500 p-8">Aucune promotion</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Multiplicateur</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Budget</TableHead>
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
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">
                            {promo.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{promo.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-teal-600">x{promo.multiplier}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {toDate(promo.startDate).toLocaleDateString()} -{" "}
                          {toDate(promo.endDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {promo.maxBudget > 0 ? (
                          <div className="text-xs">
                            ${(promo.currentSpent / 100).toFixed(0)} / $
                            {(promo.maxBudget / 100).toFixed(0)}
                            <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-teal-600 h-1.5 rounded-full"
                                style={{
                                  width: `${Math.min(100, (promo.currentSpent / promo.maxBudget) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Illimité</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(promo)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(promo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDuplicate(promo)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(promo.id)}
                            disabled={isDeleting === promo.id}
                          >
                            {isDeleting === promo.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
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

        {/* Dialog Create/Edit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingPromo ? "Modifier la promotion" : "Nouvelle promotion"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nom</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Hackathon Février"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la promotion..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v as FormData["type"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROMO_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Multiplicateur</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    step={0.5}
                    value={formData.multiplier}
                    onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date début</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Date fin</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Pays ciblés (vide = tous)</Label>
                <Input
                  value={formData.targetCountries}
                  onChange={(e) => setFormData({ ...formData, targetCountries: e.target.value })}
                  placeholder="FR, BE, CA"
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Codes ISO séparés par des virgules
                </p>
              </div>
              <div>
                <Label>Budget max (cents, 0 = illimité)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.maxBudget}
                  onChange={(e) => setFormData({ ...formData, maxBudget: parseInt(e.target.value) || 0 })}
                />
              </div>
              {editingPromo && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
                  />
                  <Label>Active</Label>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !formData.name || !formData.startDate || !formData.endDate}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {editingPromo ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsPromotions;
