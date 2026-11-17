import type { ScoreBreakdown, TicCount } from "./types.js";

/**
 * Tic Score is 0–100.
 *
 * rate        = hits / assistantWords × 1000
 * curated     = Σ (rate × weight) over every curated tic that occurred
 * discovered  = Σ min(rate, 15) × 0.4 over the top 5 discovered phrases
 * C           = curated + discovered
 * score       = round(100 × (1 − e^(−C / 8)))
 *
 * Weights live on each curated phrase in src/tics.ts. The em dash weight is
 * 0.15 because a dash is punctuation: 20 dashes per 1,000 words (heavy) adds
 * 3.0 to C, about 31 points on its own. A phrase weight of 1.6 means 5 hits
 * per 1,000 words adds 8.0 to C.
 *
 * The displayed top 5 are the largest contributors. The score still counts
 * every curated tic, including ones that did not fit on the card.
 * Discovered phrases are capped so an odd n-gram cannot outvote the catalog.
 */
export const SCORE_DIVISOR = 8;
export const DISCOVERED_WEIGHT = 0.4;
export const DISCOVERED_RATE_CAP = 15;
export const DISCOVERED_IN_SCORE = 5;

export const FORMULA_LINE = "score = round(100 × (1 − e^(−C / 8)))";

export function bandFor(score: number): { band: string; gloss: string } {
  if (score <= 15) {
    return { band: "Quiet", gloss: "Almost none of the usual tells." };
  }
  if (score <= 35) {
    return { band: "Noticeable", gloss: "A few phrases keep showing up." };
  }
  if (score <= 55) {
    return { band: "Chatty", gloss: "The habits are part of the voice." };
  }
  if (score <= 75) {
    return { band: "Tic-forward", gloss: "Readers can hear the model." };
  }
  return { band: "Catchphrase machine", gloss: "The same lines, over and over." };
}

export function scoreFromComponents(
  curatedComponent: number,
  discoveredComponent: number,
): ScoreBreakdown {
  const combined = curatedComponent + discoveredComponent;
  const value = Math.round(100 * (1 - Math.exp(-combined / SCORE_DIVISOR)));
  const clamped = Math.max(0, Math.min(100, value));
  const { band, gloss } = bandFor(clamped);
  return {
    value: clamped,
    band,
    gloss,
    combined,
    curatedComponent,
    discoveredComponent,
  };
}

export function curatedComponent(tics: readonly TicCount[]): number {
  let total = 0;
  for (const tic of tics) {
    if (tic.kind !== "curated" || tic.count <= 0) continue;
    total += tic.ratePerThousand * tic.weight;
  }
  return total;
}

export function discoveredComponent(tics: readonly TicCount[]): number {
  let total = 0;
  let used = 0;
  for (const tic of tics) {
    if (tic.kind !== "discovered" || tic.count <= 0) continue;
    if (used >= DISCOVERED_IN_SCORE) break;
    total += Math.min(tic.ratePerThousand, DISCOVERED_RATE_CAP) * DISCOVERED_WEIGHT;
    used += 1;
  }
  return total;
}

export function ratePerThousand(count: number, words: number): number {
  if (words <= 0 || count <= 0) return 0;
  return (count / words) * 1000;
}
