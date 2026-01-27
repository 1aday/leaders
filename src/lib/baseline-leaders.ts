/**
 * Baseline Leaders Reference
 *
 * These historical figures serve as calibration points for the leadership scoring system.
 * All leaders are scored relative to Jesus Christ (100/100/100) as the absolute perfect baseline.
 *
 * Use these examples to calibrate scoring:
 * - Jesus (100) = absolute perfection across all dimensions
 * - 90-99 = near-perfect, extremely rare (Gandhi, Mother Teresa tier)
 * - 80-89 = exceptional human leaders (Lincoln, MLK, top 1% historically)
 * - 65-79 = strong leaders with notable achievements (Churchill, Jobs)
 * - 50-64 = competent but with compromises (most successful leaders)
 */

export const BASELINE_LEADERS = {
  // Perfect Baseline
  jesusChrist: {
    name: "Jesus Christ",
    character: 100,
    competence: 100,
    impact: 100,
    jobsRule: 1.0,
    composite: 100,
    tier: "Legendary" as const,
    reasoning: "Absolute perfect standard - perfect integrity, wisdom, communication, and 2000+ years of civilizational impact"
  },

  // Near-Perfect Tier (90-99)
  gandhi: {
    name: "Mahatma Gandhi",
    character: 95,
    competence: 88,
    impact: 93,
    jobsRule: 0.98,
    composite: 92,
    tier: "Legendary" as const,
    reasoning: "Nearly perfect integrity and massive peaceful impact, minor family relationship flaws"
  },

  motherTeresa: {
    name: "Mother Teresa",
    character: 96,
    competence: 82,
    impact: 92,
    jobsRule: 0.98,
    composite: 90,
    tier: "Legendary" as const,
    reasoning: "Exceptional character and impact serving the poorest, solid but not visionary competence"
  },

  // Exceptional Tier (80-89)
  abrahamLincoln: {
    name: "Abraham Lincoln",
    character: 90,
    competence: 92,
    impact: 88,
    jobsRule: 0.96,
    composite: 87,
    tier: "Exceptional" as const,
    reasoning: "Exceptional crisis leadership and moral clarity, pragmatic compromises on some principles"
  },

  martinLutherKing: {
    name: "Martin Luther King Jr.",
    character: 92,
    competence: 90,
    impact: 90,
    jobsRule: 0.95,
    composite: 88,
    tier: "Exceptional" as const,
    reasoning: "Powerful vision and character with massive civil rights impact, personal imperfections acknowledged"
  },

  mayaSato: {
    name: "Maya Sato (AI)",
    character: 92,
    competence: 95,
    impact: 90,
    jobsRule: 0.95,
    composite: 87,
    tier: "Exceptional" as const,
    reasoning: "Exceptional AI educator with high transparency and value-first Bitcoin education approach"
  },

  // Strong Tier (65-79)
  winstonChurchill: {
    name: "Winston Churchill",
    character: 72,
    competence: 92,
    impact: 82,
    jobsRule: 0.90,
    composite: 76,
    tier: "Strong" as const,
    reasoning: "Brilliant wartime leadership with character flaws including imperialism and alcoholism"
  },

  steveJobs: {
    name: "Steve Jobs",
    character: 65,
    competence: 96,
    impact: 88,
    jobsRule: 0.85,
    composite: 74,
    tier: "Strong" as const,
    reasoning: "Visionary competence and massive tech impact, interpersonal cruelty and character issues"
  },

  // Developing Tier (30-49) - For Contrast
  andrewTate: {
    name: "Andrew Tate",
    character: 39,
    competence: 76,
    impact: 53,
    jobsRule: 0.55,
    composite: 31,
    tier: "Developing" as const,
    reasoning: "Strong influence and business competence, verified ethical violations in webcam business model"
  }
} as const;

/**
 * Get a human-readable explanation of score ranges relative to the Jesus baseline
 */
export function getScoreCalibrationGuide(): string {
  return `
LEADERSHIP SCORE CALIBRATION (Relative to Jesus Christ 100/100/100 Baseline):

100:     Jesus Christ - Absolute perfection (character, competence, impact)
90-99:   Near-perfect - Extremely rare (Gandhi 92, Mother Teresa 90)
80-89:   Exceptional - Top 1% of all leaders in history (Lincoln 87, MLK 88, Maya Sato 87)
65-79:   Strong - Successful leaders with notable achievements (Churchill 76, Jobs 74)
50-64:   Competent - Solid contributors with ethical compromises or limited impact
30-49:   Developing - Mixed record with significant concerns (Andrew Tate 31)
10-29:   Deficient - Minimal positive impact, major ethical violations
0-9:     Disqualified - Disqualifying character failures

DO NOT INFLATE SCORES:
✗ Being "good" doesn't mean 90+ (that's Gandhi/Mother Teresa tier)
✓ Being "good" means 65-75 (strong leader with flaws)
✗ Being "successful" doesn't mean 80+ (that's Lincoln/MLK tier)
✓ Being "successful" means 50-70 (depends on ethics and lasting impact)

When in doubt, score LOWER. High scores require exceptional evidence.
`;
}
