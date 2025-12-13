import { prisma } from "@/lib/prisma";

import { Prisma } from "@prisma/client";
import logger from "@/lib/logger";

export interface AuditLogEntry {
  tableName: string;
  recordId: string | number;
  action: "INSERT" | "UPDATE" | "DELETE" | "GENERATE_REPORT" | "EXPORT_DATA";
  oldValues?: Prisma.JsonValue;
  newValues?: Prisma.JsonValue;
  changeReason?: string;
  metadata?: Prisma.JsonValue;
  changedBy: string;
}

export class AuditLogger {
  /**
   * Enhanced audit logging for financial data changes
   * Based on XBRL and FinOps Framework best practices
   */
  static async logFinancialChange(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.financialAuditLog.create({
        data: {
          tableName: entry.tableName,
          recordId: String(entry.recordId),
          action: entry.action,
          oldValues: entry.oldValues || undefined,
          newValues: entry.newValues || undefined,
          changeReason: entry.changeReason || undefined,
          metadata: entry.metadata || undefined,
          changedBy: entry.changedBy,
        },
      });
    } catch (error) {
      logger.error("Failed to log financial change:", error);
      // Don't throw - audit logging should not break business logic
    }
  }
  static async logReportGeneration(
    reportType: string,
    periodId: string | number,
    userId: string,
    format: "PDF" | "XLSX" | "XBRL" | "JSON" = "PDF",
    filters?: Record<string, any>,
  ) {
    const metadata = {
      reportType,
      periodId: periodId.toString(),
      format,
      filters,
      timestamp: new Date().toISOString(),
    };

    await this.logFinancialChange({
      tableName: "financial_reports",
      recordId: 0, // No specific record ID for report generation
      action: "GENERATE_REPORT",
      changedBy: userId,
      changeReason: `Generated ${reportType} report in ${format} format`,
      metadata,
    });
  }

  /**
   * Log data export activities for compliance
   */
  static async logDataExport(
    exportType: string,
    recordCount: number,
    userId: string,
    filters?: Record<string, any>,
  ) {
    const metadata = {
      exportType,
      recordCount,
      filters,
      timestamp: new Date().toISOString(),
      compliance: "GDPR_COMPLIANT", // Mark as compliant export
    };

    await AuditLogger.logFinancialChange({
      tableName: "data_exports",
      recordId: 0,
      action: "EXPORT_DATA",
      changedBy: userId,
      changeReason: `Exported ${recordCount} ${exportType} records`,
      metadata,
    });
  }

  /**
   * Log period closing activities
   */
  static async logPeriodClosing(
    periodId: string | number,
    userId: string,
    status: "STARTED" | "COMPLETED" | "FAILED",
    details?: Record<string, any>,
  ) {
    const metadata = {
      periodId: periodId.toString(),
      status,
      details,
      timestamp: new Date().toISOString(),
    };

    await AuditLogger.logFinancialChange({
      tableName: "accounting_periods",
      recordId: typeof periodId === "string" ? parseInt(periodId) : periodId,
      action: status === "COMPLETED" ? "UPDATE" : "INSERT",
      changedBy: userId,
      changeReason: `Period closing ${status.toLowerCase()}`,
      metadata,
    });
  }

  /**
   * Log XBRL export activities for regulatory compliance
   */
  static async logXBRLExport(
    periodId: string | number,
    userId: string,
    schemaVersion: string = "XBRL_2.1",
    validationResults?: Record<string, any>,
  ) {
    const metadata = {
      periodId: periodId.toString(),
      schemaVersion,
      validationResults,
      timestamp: new Date().toISOString(),
      regulatoryCompliance: "XBRL_2.1_COMPLIANT",
    };

    await this.logFinancialChange({
      tableName: "xbrl_exports",
      recordId: 0,
      action: "EXPORT_DATA",
      changedBy: userId,
      changeReason: `Generated XBRL compliant financial report (${schemaVersion})`,
      metadata,
    });
  }

  /**
   * Get audit trail for a specific record
   */
  static async getAuditTrail(
    tableName: string,
    recordId: number | string,
    limit: number = 50,
  ) {
    return await prisma.financialAuditLog.findMany({
      where: {
        tableName,
        recordId: String(recordId),
      },
      orderBy: {
        changedAt: "desc",
      },
      take: limit,
    });
  }

  /**
   * Get audit summary for compliance reporting
   */
  static async getAuditSummary(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ) {
    const where: any = {
      changedAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (userId) {
      where.changedBy = userId;
    }

    const summary = await prisma.financialAuditLog.groupBy({
      by: ["tableName", "action"],
      where,
      _count: {
        id: true,
      },
    });

    return summary.map((item: any) => ({
      tableName: item.tableName,
      action: item.action,
      count: item._count.id,
    }));
  }

  /**
   * Private method to log to general activity log
   */
  static async logToActivityLog(
    userId: string,
    userName: string,
    action: string,
    entity: string,
    entityId?: string,
    description?: string,
  ): Promise<void> {
    try {
      await prisma.activityLog.create({
        data: {
          userId,
          userName,
          action,
          entity,
          entityId,
          description:
            description ||
            `${action} ${entity}${entityId ? ` (${entityId})` : ""}`,
        },
      });
    } catch (error) {
      logger.error("Failed to log to activity log:", error);
      // Don't throw - activity logging should not break business logic
    }
  }

  /**
   * Map database table names to entity types
   */
  private static mapTableToEntity(tableName: string): string {
    const mapping: Record<string, string> = {
      akun: "Account",
      jurnal: "Journal",
      jurnal_detail: "JournalDetail",
      transaksi_kasir: "CashTransaction",
      transaksi_masuk: "StockIn",
      transaksi_keluar: "StockOut",
      barang: "Product",
      lokasi: "Location",
      periode_akuntansi: "AccountingPeriod",
      saldo_awal: "OpeningBalance",
      financial_reports: "FinancialReport",
      data_exports: "DataExport",
      xbrl_exports: "XBRLExport",
    };

    return mapping[tableName] || "Unknown";
  }

  /**
   * Generate human-readable activity description
   */
  private static generateActivityDescription(entry: AuditLogEntry): string {
    const entity = this.mapTableToEntity(entry.tableName);

    switch (entry.action) {
      case "INSERT":
        return `Created new ${entity}${entry.changeReason ? `: ${entry.changeReason}` : ""}`;
      case "UPDATE":
        return `Updated ${entity}${entry.changeReason ? `: ${entry.changeReason}` : ""}`;
      case "DELETE":
        return `Deleted ${entity}${entry.changeReason ? `: ${entry.changeReason}` : ""}`;
      case "GENERATE_REPORT":
        return `Generated financial report${entry.changeReason ? `: ${entry.changeReason}` : ""}`;
      case "EXPORT_DATA":
        return `Exported data${entry.changeReason ? `: ${entry.changeReason}` : ""}`;
      default:
        return `${entry.action} ${entity}${entry.changeReason ? `: ${entry.changeReason}` : ""}`;
    }
  }
}
