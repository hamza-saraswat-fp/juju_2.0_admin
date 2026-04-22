import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ConfidenceTier, ThumbsVote, FeedbackState } from "@/types/question";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Derive tier from numeric confidence: High ≥85, Med 60-84, Low <60 */
export function confidenceTier(score: number): ConfidenceTier {
  if (score >= 85) return "high";
  if (score >= 60) return "medium";
  return "low";
}

/** Tailwind classes for confidence tier badge */
export function confidenceColor(tier: ConfidenceTier): string {
  switch (tier) {
    case "high":
      return "text-green-700 bg-green-100";
    case "medium":
      return "text-amber-700 bg-amber-100";
    case "low":
      return "text-red-700 bg-red-100";
  }
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
export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Display label for the 10 autoresponder categories.
 *  'mobile-app' → 'Mobile App', 'user-management' → 'User Management', etc. */
export function formatCategory(cat: string): string {
  if (!cat) return "";
  return cat
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Derive aggregate feedback state from a votes array */
export function deriveFeedbackState(votes: ThumbsVote[]): FeedbackState {
  if (votes.length === 0) return "none";
  const ups = votes.filter((v) => v.vote === "up").length;
  const downs = votes.filter((v) => v.vote === "down").length;
  if (ups > 0 && downs > 0) return "mixed";
  if (ups > 0) return "positive";
  if (downs > 0) return "negative";
  return "none";
}
