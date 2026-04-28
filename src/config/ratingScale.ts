import type { StarRating } from "@/types/question";

export interface RatingMeta {
  emoji: string;
  label: string;
  toneClass: string;
}

export const RATING_SCALE: Record<StarRating, RatingMeta> = {
  1: { emoji: "😡", label: "very dissatisfied", toneClass: "text-red-600" },
  2: { emoji: "😞", label: "dissatisfied", toneClass: "text-orange-600" },
  3: { emoji: "😐", label: "neutral", toneClass: "text-amber-600" },
  4: { emoji: "🙂", label: "satisfied", toneClass: "text-lime-600" },
  5: { emoji: "😃", label: "very satisfied", toneClass: "text-green-600" },
};

export function ratingMeta(stars: number): RatingMeta {
  const clamped = Math.max(1, Math.min(5, Math.round(stars))) as StarRating;
  return RATING_SCALE[clamped];
}
