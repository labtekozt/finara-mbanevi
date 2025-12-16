import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function serializeDecimal(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "number") return obj;
  if (typeof obj === "string") return obj;
  if (typeof obj === "boolean") return obj;
  if (obj instanceof Date) return obj;

  // Check if it's a Decimal (has toNumber method)
  if (obj && typeof obj === "object" && typeof obj.toNumber === "function") {
    return obj.toNumber();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDecimal);
  }

  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = serializeDecimal(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
  }).format(parsedDate);
}
