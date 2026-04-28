import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Category, Rating } from "@/types/question";
import { CATEGORY_LABELS } from "@/config/jujuTaxonomy";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Human-readable relative time: "2m ago", "3h ago", "5d ago" */
export function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Format milliseconds: "12.5s" or "850ms" */
export function formatMs(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Display label for a category. Accepts unknown strings safely. */
export function formatCategory(cat: string | null | undefined): string {
  if (!cat) return "—";
  if (cat in CATEGORY_LABELS) return CATEGORY_LABELS[cat as Category];
  return cat
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function averageRating(ratings: Rating[]): number | null {
  if (ratings.length === 0) return null;
  return ratings.reduce((s, r) => s + r.stars, 0) / ratings.length;
}

export interface RatingBreakdown {
  count: number;
  avg: number | null;
  byStars: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function ratingBreakdown(ratings: Rating[]): RatingBreakdown {
  const byStars: RatingBreakdown["byStars"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of ratings) byStars[r.stars] += 1;
  return {
    count: ratings.length,
    avg: averageRating(ratings),
    byStars,
  };
}
