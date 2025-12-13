import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, FileText, BookOpen, TrendingUp } from "lucide-react";
import { DashboardStats } from "@/types/accounting";

interface AccountingDashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export function AccountingDashboard({
  stats,
  loading,
}: AccountingDashboardProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-muted animate-pulse rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Tidak dapat memuat data dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Akun</CardTitle>
          <Calculator className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold truncate"
            title={stats.totalAkun.toString()}
          >
            {stats.totalAkun}
          </div>
          <p className="text-xs text-muted-foreground">
            Akun aktif dalam sistem
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Jurnal</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold truncate"
            title={stats.totalJurnal.toString()}
          >
            {stats.totalJurnal}
          </div>
          <p className="text-xs text-muted-foreground">Entri jurnal tercatat</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Periode Aktif</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold truncate"
            title={stats.periodeAktif}
          >
            {stats.periodeAktif}
          </div>
          <p className="text-xs text-muted-foreground">
            Periode akuntansi aktif
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status Neraca</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Badge variant={stats.isBalanced ? "default" : "destructive"}>
              {stats.isBalanced ? "Seimbang" : "Tidak Seimbang"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Status keseimbangan jurnal
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
