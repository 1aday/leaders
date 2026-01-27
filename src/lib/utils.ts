import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate composite score as the average of character, competence, and impact.
 * This ensures the composite score is always correct rather than trusting AI-generated values.
 */
export function calculateCompositeScore(
  character: number | undefined,
  competence: number | undefined,
  impact: number | undefined
): number | undefined {
  const scores = [character, competence, impact].filter(
    (s): s is number => typeof s === "number"
  );
  if (scores.length === 0) return undefined;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}
