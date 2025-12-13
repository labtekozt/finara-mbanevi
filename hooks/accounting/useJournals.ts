import { useState, useEffect, useCallback } from "react";
import {
  JurnalEntry,
  JurnalFormData,
  AccumulationData,
  AccumulationPeriod,
} from "@/types/accounting";
import { AccountingService } from "@/services/accounting";
import { toast } from "sonner";

interface UseJournalsOptions {
  periodeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  autoLoad?: boolean;
}

export function useJournals(options: UseJournalsOptions = {}) {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accumulationData, setAccumulationData] = useState<AccumulationData[]>(
    [],
  );
  const [accumulationPeriod, setAccumulationPeriod] =
    useState<AccumulationPeriod>("monthly");
  const [accumulationLoading, setAccumulationLoading] = useState(false);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await AccountingService.getJournalEntries({
        periodeId: options.periodeId,
        startDate: options.startDate,
        endDate: options.endDate,
        search: options.search,
      });
      // Ensure data is always an array
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load journal entries";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [options.periodeId, options.startDate, options.endDate, options.search]);

  const generateAccumulationData = useCallback(
    async (entries: JurnalEntry[], period: AccumulationPeriod) => {
      try {
        setAccumulationLoading(true);
        const data = await AccountingService.getAccumulationData(
          entries,
          period,
        );
        setAccumulationData(data);
      } catch (err) {
        toast.error("Gagal memuat data akumulasi");
      } finally {
        setAccumulationLoading(false);
      }
    },
    [],
  );

  const createEntry = useCallback(
    async (data: JurnalFormData): Promise<JurnalEntry | null> => {
      try {
        setLoading(true);
        const newEntry = await AccountingService.createJournalEntry(data);
        setEntries((prev) => [newEntry, ...prev]);
        toast.success("Jurnal berhasil dibuat");
        return newEntry;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create journal entry";
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const updateEntry = useCallback(
    async (
      id: string,
      data: Partial<JurnalFormData>,
    ): Promise<JurnalEntry | null> => {
      try {
        setLoading(true);
        const updatedEntry = await AccountingService.updateJournalEntry(
          id,
          data,
        );
        setEntries((prev) =>
          prev.map((entry) => (entry.id === id ? updatedEntry : entry)),
        );
        toast.success("Jurnal berhasil diperbarui");
        return updatedEntry;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update journal entry";
        setError(errorMessage);
        toast.error(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      await AccountingService.deleteJournalEntry(id);
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      toast.success("Jurnal berhasil dihapus");
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete journal entry";
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update accumulation data when entries or period changes
  useEffect(() => {
    if (entries.length > 0) {
      generateAccumulationData(entries, accumulationPeriod);
    }
  }, [entries, accumulationPeriod, generateAccumulationData]);

  useEffect(() => {
    if (options.autoLoad !== false) {
      loadEntries();
    }
  }, [loadEntries, options.autoLoad]);

  return {
    entries,
    loading,
    error,
    accumulationData,
    accumulationPeriod,
    accumulationLoading,
    setAccumulationPeriod,
    loadEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    refetch: loadEntries,
  };
}
