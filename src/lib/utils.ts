// ============================================================
// TeamHub Frontend — Utility Functions
// ============================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes with clsx + tailwind-merge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to a human-readable format.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date string to include time.
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get relative time string (e.g., "2 hours ago").
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return formatDate(dateString);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return "just now";
}

/**
 * Truncate a string to a max length, adding ellipsis if needed.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Generate a slug from a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Check if a date string represents a date in the past.
 */
export function isOverdue(dateString: string | null): boolean {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
}

/**
 * Format a number with commas for display.
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}

/**
 * Validate an email address format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Deep clone an object (JSON-safe only).
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Compare two dates formatted as ISO strings (YYYY-MM-DD).
 * Returns true if dateA is after dateB.
 */
export function isDateAfter(dateA: string, dateB: string): boolean {
  return new Date(dateA).getTime() > new Date(dateB).getTime();
}

/**
 * Lightweight date string comparison for sorting — avoids creating Date
 * objects for better performance when dealing with large task lists.
 * Expects ISO-style date strings (e.g., "2024-03-15").
 * Returns  1 if dateA > dateB, -1 if dateA < dateB, 0 if equal.
 */
export function compareDateStrings(dateA: string, dateB: string): number {
  return dateA > dateB ? 1 : dateA < dateB ? -1 : 0;
}

/**
 * Filter items by a date range using proper Date comparison.
 */
export function filterByDateRange<T>(
  items: T[],
  getDate: (item: T) => string | null,
  startDate: string | null,
  endDate: string | null
): T[] {
  return items.filter((item) => {
    const dateStr = getDate(item);
    if (!dateStr) return false;

    const itemDate = new Date(dateStr).getTime();

    if (startDate && itemDate < new Date(startDate).getTime()) return false;
    if (endDate && itemDate > new Date(endDate).getTime()) return false;

    return true;
  });
}
