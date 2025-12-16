"use client";

import { CashFlowReport } from "@/components/accounting/CashFlowReport";

export default function CashFlowPage() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Arus Kas</h2>
          <p className="text-muted-foreground mt-1">
            Laporan arus keluar masuk keuangan
          </p>
        </div>
      </div>

      <CashFlowReport />
    </div>
  );
}
