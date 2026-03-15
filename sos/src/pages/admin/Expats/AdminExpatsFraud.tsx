/**
 * AdminExpatsFraud - Fraud detection page for the Expat referral system
 *
 * Reuses the same backend (adminGetReferralFraudAlerts) filtered to expat-related alerts.
 */

import React, { useState, useEffect, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functionsAffiliate } from "@/config/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type StatusType } from "@/components/admin/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2, RefreshCw, ShieldAlert, AlertTriangle, CheckCircle,
  XCircle, Eye, Ban, RotateCcw,
} from "lucide-react";
import AdminLayout from "../../../components/admin/AdminLayout";

interface FraudAlert {
  id: string;
  chatterId: string;
  chatterName: string;
  chatterEmail: string;
  type: "high_ratio" | "circular_referral" | "multiple_accounts" | "suspicious_pattern";
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "reviewed" | "dismissed" | "action_taken";
  details: {
    ratio?: number;
    chain?: string[];
    relatedAccounts?: string[];
    pattern?: string;
  };
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

interface FraudStats {
  totalAlerts: number;
  pendingAlerts: number;
  highSeverityCount: number;
  blockedChattersCount: number;
}

const AdminExpatsFraud: React.FC = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [stats, setStats] = useState<FraudStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const getAlertsFn = httpsCallable<
        { statusFilter?: string; typeFilter?: string; role?: string },
        { alerts: FraudAlert[]; stats: FraudStats }
      >(functionsAffiliate, "adminGetReferralFraudAlerts");

      const result = await getAlertsFn({
        statusFilter: statusFilter !== "all" ? statusFilter : undefined,
        typeFilter: typeFilter !== "all" ? typeFilter : undefined,
        role: "expat",
      });

      setAlerts(result.data.alerts);
      setStats(result.data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReviewAlert = async (alertId: string, action: "dismiss" | "take_action" | "block") => {
    setIsReviewing(true);
    try {
      const reviewFn = httpsCallable<
        { alertId: string; action: string; notes: string },
        { success: boolean }
      >(functionsAffiliate, "adminReviewFraudAlert");

      await reviewFn({ alertId, action, notes: reviewNotes });
      setSelectedAlert(null);
      setReviewNotes("");
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to review alert");
    } finally {
      setIsReviewing(false);
    }
  };

  const mapSeverity = (severity: string): { status: StatusType; label: string } => {
    switch (severity) {
      case "critical": return { status: "error", label: "Critique" };
      case "high": return { status: "warning", label: "Eleve" };
      case "medium": return { status: "warning", label: "Moyen" };
      case "low": return { status: "info", label: "Faible" };
      default: return { status: "pending", label: severity };
    }
  };

  const mapFraudStatus = (status: string): { status: StatusType; label: string } => {
    switch (status) {
      case "pending": return { status: "pending", label: "En attente" };
      case "reviewed": return { status: "info", label: "Examine" };
      case "dismissed": return { status: "inactive", label: "Rejete" };
      case "action_taken": return { status: "success", label: "Action prise" };
      default: return { status: "pending", label: status };
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      high_ratio: "Ratio eleve",
      circular_referral: "Parrainage circulaire",
      multiple_accounts: "Comptes multiples",
      suspicious_pattern: "Pattern suspect",
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "high_ratio": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "circular_referral": return <RotateCcw className="h-4 w-4 text-red-500" />;
      case "multiple_accounts": return <Ban className="h-4 w-4 text-orange-500" />;
      default: return <ShieldAlert className="h-4 w-4 text-purple-500" />;
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-7 w-7 text-red-500" />
              Fraude Expatries Aidants
            </h1>
            <p className="text-gray-500 mt-1">Detection de fraude et patterns suspects</p>
          </div>
          <Button onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><ShieldAlert className="h-6 w-6 text-red-600" /></div><div><p className="text-sm text-gray-500">Total Alertes</p><p className="text-2xl font-bold">{stats.totalAlerts}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-yellow-600" /></div><div><p className="text-sm text-gray-500">En attente</p><p className="text-2xl font-bold">{stats.pendingAlerts}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-orange-600" /></div><div><p className="text-sm text-gray-500">Severite elevee</p><p className="text-2xl font-bold">{stats.highSeverityCount}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center"><Ban className="h-6 w-6 text-gray-600" /></div><div><p className="text-sm text-gray-500">Bloques</p><p className="text-2xl font-bold">{stats.blockedChattersCount}</p></div></div></CardContent></Card>
          </div>
        )}

        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="reviewed">Examine</SelectItem>
              <SelectItem value="dismissed">Rejete</SelectItem>
              <SelectItem value="action_taken">Action prise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="high_ratio">Ratio eleve</SelectItem>
              <SelectItem value="circular_referral">Parrainage circulaire</SelectItem>
              <SelectItem value="multiple_accounts">Comptes multiples</SelectItem>
              <SelectItem value="suspicious_pattern">Pattern suspect</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader><CardTitle>Alertes detectees</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <p className="text-gray-500">Aucune alerte detectee</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Expatrie</TableHead>
                    <TableHead>Severite</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell><div className="flex items-center gap-2">{getTypeIcon(alert.type)}<span>{getTypeLabel(alert.type)}</span></div></TableCell>
                      <TableCell><div><p className="font-medium">{alert.chatterName}</p><p className="text-xs text-gray-500">{alert.chatterEmail}</p></div></TableCell>
                      <TableCell>{(() => { const m = mapSeverity(alert.severity); return <StatusBadge status={m.status} label={m.label} size="sm" />; })()}</TableCell>
                      <TableCell>
                        <div className="text-sm max-w-xs">
                          {alert.type === "high_ratio" && alert.details.ratio && <span>Ratio: {alert.details.ratio.toFixed(2)}</span>}
                          {alert.type === "circular_referral" && alert.details.chain && <span>Chaine: {alert.details.chain.join(" > ")}</span>}
                          {alert.type === "multiple_accounts" && alert.details.relatedAccounts && <span>{alert.details.relatedAccounts.length} comptes lies</span>}
                          {alert.details.pattern && <span>{alert.details.pattern}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{(() => { const m = mapFraudStatus(alert.status); return <StatusBadge status={m.status} label={m.label} size="sm" />; })()}</TableCell>
                      <TableCell>{new Date(alert.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell><Button variant="ghost" size="sm" onClick={() => setSelectedAlert(alert)}><Eye className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-500" />
                Examiner l'alerte
              </DialogTitle>
            </DialogHeader>
            {selectedAlert && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type</p>
                    <div className="flex items-center gap-2 mt-1">{getTypeIcon(selectedAlert.type)}<span>{getTypeLabel(selectedAlert.type)}</span></div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Severite</p>
                    <div className="mt-1">{(() => { const m = mapSeverity(selectedAlert.severity); return <StatusBadge status={m.status} label={m.label} size="sm" />; })()}</div>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Expatrie</p>
                  <div className="mt-1">
                    <p className="font-medium">{selectedAlert.chatterName}</p>
                    <p className="text-sm text-gray-500">{selectedAlert.chatterEmail}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Details</p>
                  <div className="mt-1 p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                    {selectedAlert.type === "high_ratio" && selectedAlert.details.ratio && (
                      <p>Ratio: <strong>{selectedAlert.details.ratio.toFixed(2)}</strong></p>
                    )}
                    {selectedAlert.type === "circular_referral" && selectedAlert.details.chain && (
                      <div className="flex flex-wrap items-center gap-1">
                        {selectedAlert.details.chain.map((id, idx) => (
                          <React.Fragment key={id}>
                            <Badge variant="secondary">{id.slice(0, 8)}...</Badge>
                            {idx < selectedAlert.details.chain!.length - 1 && <span>&rarr;</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                    {selectedAlert.type === "multiple_accounts" && selectedAlert.details.relatedAccounts && (
                      <div className="space-y-1">
                        {selectedAlert.details.relatedAccounts.map((acc) => (
                          <Badge key={acc} variant="outline" className="mr-1">{acc}</Badge>
                        ))}
                      </div>
                    )}
                    {selectedAlert.details.pattern && <p>{selectedAlert.details.pattern}</p>}
                  </div>
                </div>
                {selectedAlert.status === "pending" && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Notes de revision</p>
                    <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Ajouter des notes..." rows={3} />
                  </div>
                )}
                {selectedAlert.reviewNotes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Notes precedentes</p>
                    <p className="mt-1 text-sm">{selectedAlert.reviewNotes}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="gap-2">
              {selectedAlert?.status === "pending" && (
                <>
                  <Button variant="outline" onClick={() => handleReviewAlert(selectedAlert.id, "dismiss")} disabled={isReviewing}>
                    <XCircle className="h-4 w-4 mr-2" />Rejeter
                  </Button>
                  <Button variant="outline" onClick={() => handleReviewAlert(selectedAlert.id, "take_action")} disabled={isReviewing}>
                    <CheckCircle className="h-4 w-4 mr-2" />Marquer traite
                  </Button>
                  <Button variant="destructive" onClick={() => handleReviewAlert(selectedAlert.id, "block")} disabled={isReviewing}>
                    {isReviewing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                    Bloquer
                  </Button>
                </>
              )}
              {selectedAlert?.status !== "pending" && (
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>Fermer</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminExpatsFraud;
