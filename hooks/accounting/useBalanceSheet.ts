import { useState, useEffect } from "react";
import { AccountingService } from "@/services/accounting";
import { BalanceSheetData } from "@/types/accounting";

interface UseBalanceSheetOptions {
  periodeId?: string;
  startDate?: string;
  endDate?: string;
  autoLoad?: boolean;
}

export function useBalanceSheet(options: UseBalanceSheetOptions = {}) {
  const [data, setData] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await AccountingService.getBalanceSheet(
        options.periodeId,
        options.startDate,
        options.endDate,
      );
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch balance sheet",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.autoLoad !== false) {
      fetchData();
    }
  }, [options.periodeId, options.startDate, options.endDate, options.autoLoad]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
