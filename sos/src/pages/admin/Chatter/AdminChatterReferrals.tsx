/**
 * AdminChatterReferrals
 *
 * Admin page for managing chatter referrals, viewing referral tree,
 * and overall referral statistics.
 */

import React, { useState, useEffect, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { functionsAffiliate } from "@/config/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Users,
  DollarSign,
  TrendingUp,
  Search,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import AdminLayout from '../../../components/admin/AdminLayout';

interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  totalReferralEarnings: number;
  monthlyReferralEarnings: number;
  averageReferralsPerChatter: number;
  topReferrersCount: number;
}

interface ReferralCommission {
  id: string;
  chatterId: string;
  chatterName: string;
  filleulId: string;
  filleulName: string;
  type: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface ReferralTreeNode {
  id: string;
  name: string;
  email: string;
  totalEarned: number;
  qualifiedReferralsCount: number;
  filleuls: ReferralTreeNode[];
}

const AdminChatterReferrals: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
  const [referralTree, setReferralTree] = useState<ReferralTreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchStats = useCallback(async () => {
    try {
      const getStatsFn = httpsCallable<void, { stats: ReferralStats }>(
        functionsAffiliate,
        "adminGetReferralStats"
      );
      const result = await getStatsFn();
      setStats(result.data.stats);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, []);

  const fetchCommissions = useCallback(async () => {
    try {
      const getCommissionsFn = httpsCallable<
        { limit: number; statusFilter?: string; typeFilter?: string },
        { commissions: ReferralCommission[] }
      >(functionsAffiliate, "adminGetReferralCommissions");
      const result = await getCommissionsFn({
        limit: 100,
        statusFilter: statusFilter !== "all" ? statusFilter : undefined,
        typeFilter: typeFilter !== "all" ? typeFilter : undefined,
      });
      setCommissions(result.data.commissions);
    } catch (err) {
      console.error("Error fetching commissions:", err);
    }
  }, [statusFilter, typeFilter]);

  const fetchReferralTree = useCallback(async () => {
    try {
      const getTreeFn = httpsCallable<
        { searchTerm?: string },
        { tree: ReferralTreeNode[] }
      >(functionsAffiliate, "adminGetReferralTree");
      const result = await getTreeFn({
        searchTerm: searchTerm || undefined,
      });
      setReferralTree(result.data.tree);
    } catch (err) {
      console.error("Error fetching referral tree:", err);
    }
  }, [searchTerm]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchStats(), fetchCommissions(), fetchReferralTree()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  }, [fetchStats, fetchCommissions, fetchReferralTree]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      fetchCommissions();
    }
  }, [statusFilter, typeFilter]);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const renderTreeNode = (node: ReferralTreeNode, level: number = 0) => {
    const hasFilleuls = node.filleuls && node.filleuls.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} style={{ marginLeft: level * 24 }}>
        <div
          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 ${
            level === 0 ? "bg-gray-50 dark:bg-white/5" : ""
          }`}
        >
          {hasFilleuls ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{node.name}</span>
            </div>
            <p className="text-xs text-gray-500">{node.email}</p>
          </div>

          <div className="text-right">
            <p className="font-medium text-green-600">
              ${(node.totalEarned / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              {node.qualifiedReferralsCount} qualifiés
            </p>
          </div>

          {hasFilleuls && (
            <Badge variant="secondary">{node.filleuls.length} filleuls</Badge>
          )}
        </div>

        {isExpanded && hasFilleuls && (
          <div className="border-l-2 border-gray-200 dark:border-white/10 ml-3">
            {node.filleuls.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">En attente</Badge>;
      case "validated":
        return <Badge className="bg-blue-500">Validé</Badge>;
      case "available":
        return <Badge className="bg-green-500">Disponible</Badge>;
      case "paid":
        return <Badge className="bg-purple-500">Payé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      threshold_10: "Seuil 10$",
      threshold_50: "Seuil 50$",
      threshold_50_n2: "Seuil 50$ N2",
      n1_per_call: "$1/appel N1",
      tier_bonus: "Bonus palier",
    };
    return <Badge variant="outline">{typeLabels[type] || type}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-7 w-7" />
              Gestion Parrainage Chatters
            </h1>
            <p className="text-gray-500 mt-1">
              Statistiques, commissions et arbre de parrainage
            </p>
          </div>
          <Button onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Filleuls</p>
                  <p className="text-2xl font-bold">{stats.totalReferrals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Commissions</p>
                  <p className="text-2xl font-bold">
                    ${(stats.totalReferralEarnings / 100).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ce mois</p>
                  <p className="text-2xl font-bold">
                    ${(stats.monthlyReferralEarnings / 100).toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* Referral Tree */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Arbre de Parrainage
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Rechercher un chatter..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" onClick={fetchReferralTree}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : referralTree.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucun parrain trouvé
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {referralTree.map((node) => renderTreeNode(node))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Commissions Récentes
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="validated">Validé</SelectItem>
                  <SelectItem value="available">Disponible</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="threshold_10">Seuil 10$</SelectItem>
                  <SelectItem value="threshold_50">Seuil 50$</SelectItem>
                  <SelectItem value="threshold_50_n2">Seuil 50$ N2</SelectItem>
                  <SelectItem value="n1_per_call">$1/appel N1</SelectItem>
                  <SelectItem value="tier_bonus">Bonus palier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : commissions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              Aucune commission trouvée
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parrain</TableHead>
                  <TableHead>Filleul</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">
                      {commission.chatterName}
                    </TableCell>
                    <TableCell>{commission.filleulName}</TableCell>
                    <TableCell>{getTypeBadge(commission.type)}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ${(commission.amount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(commission.status)}</TableCell>
                    <TableCell>
                      {new Date(commission.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
    </AdminLayout>
  );
};

export default AdminChatterReferrals;
