import { useState, useEffect } from "react";
import { CashFlowData } from "@/types/accounting";

interface UseCashFlowOptions {
  startDate: string;
  endDate: string;
  autoLoad?: boolean;
}

export function useCashFlow(options: UseCashFlowOptions) {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!options.startDate || !options.endDate) {
      setError("Start date and end date are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams({
        startDate: options.startDate,
        endDate: options.endDate,
      });

      const response = await fetch(
        `/api/akuntansi/laporan/cash-flow?${searchParams}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch cash flow");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch cash flow",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.autoLoad !== false && options.startDate && options.endDate) {
      fetchData();
    }
  }, [options.startDate, options.endDate, options.autoLoad]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
