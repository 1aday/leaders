import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate achievement score using Leaders.ai 3-pillar weighted formula (before Jobs Rule).
 * Achievement = (Character × 0.39) + (Competence × 0.30) + (Impact × 0.31)
 *
 * This reflects the Leaders.ai philosophy:
 * - Character weighs most (39%): Integrity, beneficence, vulnerability, accountability, consistency
 * - Impact weighs second (31%): Value creation, trustworthiness, results
 * - Competence weighs third (30%): Vision, expertise, communication, courage
 */
export function calculateAchievementScore(
  character: number | undefined,
  competence: number | undefined,
  impact: number | undefined
): number | undefined {
  const scores = [
    character !== undefined ? character * 0.39 : undefined,
    competence !== undefined ? competence * 0.30 : undefined,
    impact !== undefined ? impact * 0.31 : undefined,
  ].filter((s): s is number => s !== undefined);

  if (scores.length === 0) return undefined;
  return Math.round(scores.reduce((a, b) => a + b, 0));
}

/**
 * Calculate final composite score with Jobs Rule ethical multiplier applied.
 * Final Composite = Achievement Score × Jobs Rule Multiplier
 *
 * Jobs Rule Multiplier (0-1.0):
 * - 1.0 = Clean / Exemplary conduct
 * - 0.75 = Minor ethical flaws
 * - 0.5 = Notable ethical concerns
 * - 0.25 = Significant ethical violations
 * - 0 = Disqualifying character failures
 *
 * This ensures the composite score is always correct rather than trusting AI-generated values.
 */
export function calculateCompositeScore(
  character: number | undefined,
  competence: number | undefined,
  impact: number | undefined,
  jobsRuleMultiplier: number = 1.0
): number | undefined {
  const achievement = calculateAchievementScore(character, competence, impact);
  if (achievement === undefined) return undefined;
  return Math.round(achievement * jobsRuleMultiplier);
}
