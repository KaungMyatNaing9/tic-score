import { BIGRAMS, UNIGRAMS } from "./baseline/table.js";

/**
 * English baseline from Peter Norvig's Google n-gram counts
 * (https://norvig.com/ngrams/). The tables are the top 8,000 alphabetic
 * unigrams and top 4,000 alphabetic bigrams, scaled to counts per million
 * inside that slice. A word missing from the slice uses the rarest included
 * rate as a floor, so a genuinely unusual phrase can surface and "the" cannot.
 */

let unigrams: Map<string, number> | null = null;
let bigrams: Map<string, number> | null = null;
let unigramFloor = 1;
let bigramFloor = 1;

function parseTable(raw: string): { map: Map<string, number>; floor: number } {
  const map = new Map<string, number>();
  let floor = Number.POSITIVE_INFINITY;
  for (const line of raw.split("\n")) {
    if (!line) continue;
    const space = line.lastIndexOf(" ");
    if (space <= 0) continue;
    const phrase = line.slice(0, space);
    const count = Number(line.slice(space + 1));
    if (!phrase || !Number.isFinite(count)) continue;
    map.set(phrase, count);
    if (count < floor) floor = count;
  }
  if (!Number.isFinite(floor)) floor = 1;
  return { map, floor };
}

function tables(): {
  unigrams: Map<string, number>;
  bigrams: Map<string, number>;
  unigramFloor: number;
  bigramFloor: number;
} {
  if (!unigrams || !bigrams) {
    const uni = parseTable(UNIGRAMS);
    const bi = parseTable(BIGRAMS);
    unigrams = uni.map;
    bigrams = bi.map;
    unigramFloor = uni.floor;
    bigramFloor = bi.floor;
  }
  return { unigrams, bigrams, unigramFloor, bigramFloor };
}

/** Baseline rate per thousand words. OOV unigrams and bigrams use the slice floor. Trigrams use half the bigram floor. */
export function baselinePerThousand(phrase: string): number {
  const { unigrams: uni, bigrams: bi, unigramFloor: uFloor, bigramFloor: bFloor } = tables();
  const parts = phrase.split(" ");
  if (parts.length === 1) {
    const perMillion = uni.get(phrase) ?? uFloor;
    return perMillion / 1000;
  }
  if (parts.length === 2) {
    const perMillion = bi.get(phrase) ?? bFloor;
    return perMillion / 1000;
  }
  return bFloor / 1000 / 2;
}

export function unigramKnown(word: string): boolean {
  return tables().unigrams.has(word);
}

export function baselineSize(): { unigrams: number; bigrams: number } {
  const loaded = tables();
  return { unigrams: loaded.unigrams.size, bigrams: loaded.bigrams.size };
}
