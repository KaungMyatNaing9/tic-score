export interface TicDef {
  id: string;
  /** How the phrase appears on the card. */
  label: string;
  /** Source string for a global, case-insensitive regex. */
  pattern: string;
  flags: string;
  weight: number;
  instead: string;
  /** Why it is on the list. */
  note: string;
  /** A string the pattern must match. */
  example: string;
  /** A string the pattern must not match. */
  negative: string;
}

/**
 * Curated tells. Weights are part of the score formula (see src/formula.ts).
 * Longer phrases are applied first when spans overlap, so "let me know" does
 * not also count as "let me", and "you're absolutely right" does not also
 * count as a sentence-initial "absolutely".
 */
export const TICS: readonly TicDef[] = [
  {
    id: "absolutely-right",
    label: "You're absolutely right",
    pattern: String.raw`\byou(?:['’]re| are) absolutely (?:right|correct|spot[- ]on)\b`,
    flags: "gi",
    weight: 1.6,
    instead: "Delete the agreement. Start with the fact or the next step.",
    note: "The phrase in anthropics/claude-code#3382.",
    example: "You're absolutely right.",
    negative: "You are right about the offset.",
  },
  {
    id: "youre-right",
    label: "You're right",
    pattern: String.raw`\byou(?:['’]re| are) right\b`,
    flags: "gi",
    weight: 0.8,
    instead: "Delete it. If they were right, say what that changes.",
    note: "Shorter cousin of the #3382 phrase. Does not match when 'absolutely' sits in between.",
    example: "You're right.",
    negative: "The right file is open.",
  },
  {
    id: "great-question",
    label: "Great question",
    pattern: String.raw`\b(?:that(?:['’]s| is) an? )?(?:great|excellent|good) question\b`,
    flags: "gi",
    weight: 1.3,
    instead: "Delete it. Answer.",
    note: "Stock opener. Also matches 'good question' and 'excellent question'.",
    example: "Great question.",
    negative: "The question is still open.",
  },
  {
    id: "good-catch",
    label: "Good catch",
    pattern: String.raw`\b(?:good|great) catch\b`,
    flags: "gi",
    weight: 0.7,
    instead: "Say what was wrong, or just fix it.",
    note: "Reflexive praise before the actual correction.",
    example: "Good catch.",
    negative: "Catch the error in the test.",
  },
  {
    id: "fair-point",
    label: "Fair point",
    pattern: String.raw`\b(?:fair|great|excellent|valid) point\b`,
    flags: "gi",
    weight: 0.6,
    instead: "Address the point itself.",
    note: "Agreement filler. 'The point of the index' does not match.",
    example: "Fair point.",
    negative: "The point of the index is speed.",
  },
  {
    id: "happy-to-help",
    label: "Happy to help",
    pattern: String.raw`\b(?:i(?:['’]d| would) be |i am |i(?:['’]m) )?happy to help\b`,
    flags: "gi",
    weight: 1,
    instead: "Delete it.",
    note: "Customer-support opener. Matches 'I'd be happy to help' too.",
    example: "Happy to help.",
    negative: "I can help with the index.",
  },
  {
    id: "let-me-know",
    label: "Let me know",
    pattern: String.raw`\blet me know\b`,
    flags: "gi",
    weight: 0.9,
    instead: "Name the real next step, or stop.",
    note: "Generic closing offer. Consumes the span so it is not also counted as 'let me'.",
    example: "Let me know if the header changes.",
    negative: "Let me trace the offset.",
  },
  {
    id: "let-me",
    label: "Let me",
    pattern: String.raw`\blet me\b`,
    flags: "gi",
    weight: 0.7,
    instead: "Start with the action or the result.",
    note: "Narrated intent. Overlaps 'let me know'; the longer phrase wins.",
    example: "Let me trace the offset.",
    negative: "A letter to me arrived.",
  },
  {
    id: "hope-this-helps",
    label: "I hope this helps",
    pattern: String.raw`\bi hope this helps\b`,
    flags: "gi",
    weight: 1,
    instead: "Delete it.",
    note: "Stock closing line.",
    example: "I hope this helps.",
    negative: "This helps the index.",
  },
  {
    id: "feel-free",
    label: "Feel free",
    pattern: String.raw`\bfeel free\b`,
    flags: "gi",
    weight: 0.8,
    instead: "Delete it.",
    note: "Stock permission line.",
    example: "Feel free to edit it.",
    negative: "The free list is empty.",
  },
  {
    id: "i-apologize",
    label: "I apologize",
    pattern: String.raw`\bi apologize\b`,
    flags: "gi",
    weight: 0.7,
    instead: "Name the mistake and the fix, without the apology frame.",
    note: "Apology frame that often replaces the actual correction.",
    example: "I apologize for the mixup.",
    negative: "No apology is needed.",
  },
  {
    id: "load-bearing",
    label: "load-bearing",
    pattern: String.raw`\bload[- ]bearing\b`,
    flags: "gi",
    weight: 1.5,
    instead: 'Name the dependency. Say "required", or say what breaks.',
    note: "anthropics/claude-code#53454 and the rhetorical-tic report #77136.",
    example: "The index is load-bearing.",
    negative: "The loader is bearing left.",
  },
  {
    id: "delve",
    label: "delve",
    pattern: String.raw`\bdelv(?:e|es|ed|ing)\b`,
    flags: "gi",
    weight: 1.2,
    instead: 'Say "look at", "read", or "go through".',
    note: "Classic model verb. Matches delve, delved, and delving.",
    example: "I will not delve into it.",
    negative: "The delta is small.",
  },
  {
    id: "robust",
    label: "robust",
    pattern: String.raw`\brobust(?:ly|ness)?\b`,
    flags: "gi",
    weight: 0.9,
    instead: "Name the property: tested, handles empty input, retries.",
    note: "Often a compliment with no content. Also matches robustly and robustness.",
    example: "The helper is robust enough.",
    negative: "A ruby test failed.",
  },
  {
    id: "em-dash",
    label: "em dash",
    pattern: String.raw`\u2014|(?<=\s)\u2013(?=\s)`,
    flags: "g",
    weight: 0.15,
    instead: "Use a period, comma, colon, or parentheses.",
    note: "Unicode em dash, plus a spaced en dash. ASCII '--' is not counted. See #57952.",
    example: "The old path — still parses.",
    negative: "a-b and a -- b",
  },
  {
    id: "worth-noting",
    label: "it's worth noting",
    pattern: String.raw`\bit(?:['’]s| is) worth noting\b`,
    flags: "gi",
    weight: 1.1,
    instead: "Delete the opener. State the fact.",
    note: "Throat-clearing. Straight and curly apostrophes both match.",
    example: "It's worth noting the gap.",
    negative: "The worth of the note is low.",
  },
  {
    id: "important-to-note",
    label: "important to note",
    pattern: String.raw`\bit(?:['’]s| is) important to (?:note|understand|remember)\b`,
    flags: "gi",
    weight: 1,
    instead: "Delete the opener. State the fact.",
    note: "Same move as 'worth noting', different costume.",
    example: "It is important to note the gap.",
    negative: "An important test failed.",
  },
  {
    id: "deep-dive",
    label: "deep dive",
    pattern: String.raw`\b(?:deep[- ]dive|dive deep|dive into)\b`,
    flags: "gi",
    weight: 0.8,
    instead: 'Say "read", "trace", or "inspect".',
    note: "Matches 'deep dive', 'dive deep', and 'dive into'.",
    example: "A deep dive is not needed.",
    negative: "The dive shop is closed.",
  },
  {
    id: "circle-back",
    label: "circle back",
    pattern: String.raw`\bcircle back\b`,
    flags: "gi",
    weight: 0.9,
    instead: 'Say "return to", or name when you will do it.',
    note: "Meeting-speak.",
    example: "Please circle back tomorrow.",
    negative: "The circle is closed.",
  },
  {
    id: "moving-forward",
    label: "moving forward",
    pattern: String.raw`\bmoving forward\b`,
    flags: "gi",
    weight: 0.7,
    instead: 'Delete it, or say "next".',
    note: "Filler transition.",
    example: "Moving forward, the seam is the API.",
    negative: "Moving the cursor forward.",
  },
  {
    id: "end-of-the-day",
    label: "at the end of the day",
    pattern: String.raw`\bat the end of the day\b`,
    flags: "gi",
    weight: 1,
    instead: "Delete it. Say the conclusion.",
    note: "Cliché summary frame.",
    example: "At the end of the day, the test passes.",
    negative: "The end of the file is a newline.",
  },
  {
    id: "game-changer",
    label: "game-changer",
    pattern: String.raw`\bgame[- ]changer\b`,
    flags: "gi",
    weight: 1.1,
    instead: "Say what changed.",
    note: "Hype noun. Matches the hyphenated and spaced forms.",
    example: "It is not a game-changer.",
    negative: "The game is paused.",
  },
  {
    id: "cutting-edge",
    label: "cutting-edge",
    pattern: String.raw`\bcutting[- ]edge\b`,
    flags: "gi",
    weight: 0.8,
    instead: "Name the specific technology.",
    note: "Hype adjective.",
    example: "The note says cutting-edge once.",
    negative: "The cutting board has an edge.",
  },
  {
    id: "seamless",
    label: "seamless",
    pattern: String.raw`\bseamless(?:ly)?\b`,
    flags: "gi",
    weight: 0.8,
    instead: "Say what the user no longer has to do.",
    note: "Matches seamless and seamlessly.",
    example: "We should not call it seamless.",
    negative: "The seam is the API.",
  },
  {
    id: "leverage",
    label: "leverage",
    pattern: String.raw`\bleverage[ds]?\b`,
    flags: "gi",
    weight: 0.5,
    instead: 'Say "use".',
    note: "Low weight: the noun is legitimate in finance and mechanics. Matches leverage, leveraged, leverages.",
    example: "Do not leverage the cache.",
    negative: "The lever is stuck.",
  },
  {
    id: "tapestry",
    label: "tapestry",
    pattern: String.raw`\btapestry\b`,
    flags: "gi",
    weight: 1.2,
    instead: "Delete the metaphor.",
    note: "Ornamental metaphor called out in claude-code#77136's family of tells.",
    example: "This branch is a tapestry of excuses.",
    negative: "The tape is sticky.",
  },
  {
    id: "nestled",
    label: "nestled",
    pattern: String.raw`\bnestled\b`,
    flags: "gi",
    weight: 1.1,
    instead: 'Say "in" or "inside".',
    note: "Travel-brochure verb that shows up in technical prose.",
    example: "The helper is nestled in the loop.",
    negative: "The nest is empty.",
  },
  {
    id: "vibrant",
    label: "vibrant",
    pattern: String.raw`\bvibrant\b`,
    flags: "gi",
    weight: 0.8,
    instead: "Name the actual quality.",
    note: "Empty positive adjective.",
    example: "A vibrant response.",
    negative: "The vibe is fine.",
  },
  {
    id: "multifaceted",
    label: "multifaceted",
    pattern: String.raw`\bmultifaceted\b`,
    flags: "gi",
    weight: 1,
    instead: "Name the parts.",
    note: "Says 'complex' without naming a part.",
    example: "A multifaceted bug.",
    negative: "Many faces of the bug.",
  },
  {
    id: "pivotal",
    label: "pivotal",
    pattern: String.raw`\bpivotal\b`,
    flags: "gi",
    weight: 0.6,
    instead: "Say why it matters.",
    note: "Drama adjective. Lower weight because it is sometimes accurate.",
    example: "The pivotal row.",
    negative: "The pivot table is unused.",
  },
  {
    id: "realm",
    label: "realm",
    pattern: String.raw`\brealms?\b`,
    flags: "gi",
    weight: 0.6,
    instead: "Name the area.",
    note: "Matches realm and realms.",
    example: "In the realm of parsers.",
    negative: "The real match is smaller.",
  },
  {
    id: "hand-waving",
    label: "hand-waving",
    pattern: String.raw`\bhand[- ]wav(?:ing|y)\b`,
    flags: "gi",
    weight: 1,
    instead: "Say what was skipped.",
    note: "Called out in claude-code#77136. Matches hand-waving, hand waving, and hand-wavy.",
    example: "That explanation is hand-waving.",
    negative: "Wave at the handoff.",
  },
  {
    id: "honest-framing",
    label: "honest framing",
    pattern: String.raw`\bhonest framing\b`,
    flags: "gi",
    weight: 1.1,
    instead: "Delete the frame. Say the thing.",
    note: "A phrase #77136 lists as propagated jargon.",
    example: "Skip the honest framing.",
    negative: "An honest bug report.",
  },
  {
    id: "heres-the-thing",
    label: "here's the thing",
    pattern: String.raw`\bhere(?:['’]s| is) the thing\b`,
    flags: "gi",
    weight: 0.9,
    instead: "Delete it.",
    note: "Podcast opener.",
    example: "Here's the thing.",
    negative: "Here is the file.",
  },
  {
    id: "key-takeaway",
    label: "key takeaway",
    pattern: String.raw`\bkey takeaways?\b`,
    flags: "gi",
    weight: 0.8,
    instead: "State the takeaway with no label.",
    note: "Slide-deck label.",
    example: "The key takeaway is the bounds check.",
    negative: "The key is a small brass takeaway.",
  },
  {
    id: "to-be-clear",
    label: "to be clear",
    pattern: String.raw`\b(?:just )?to be clear\b`,
    flags: "gi",
    weight: 0.5,
    instead: "Delete it, then be clear.",
    note: "Low weight. Sometimes it really is a clarification.",
    example: "To be clear, the offset is wrong.",
    negative: "Clear the cache.",
  },
  {
    id: "absolutely",
    label: "Absolutely",
    pattern: String.raw`(?:^|(?<=[.!?]\s+))absolutely\b`,
    flags: "gim",
    weight: 0.6,
    instead: "Delete the opener.",
    note: "Sentence-initial only, so 'you're absolutely right' is not counted twice.",
    example: "Absolutely. The row is wrong.",
    negative: "You're absolutely right.",
  },
  {
    id: "certainly",
    label: "Certainly",
    pattern: String.raw`(?:^|(?<=[.!?]\s+))certainly\b`,
    flags: "gim",
    weight: 0.5,
    instead: "Delete the opener.",
    note: "Sentence-initial only.",
    example: "Certainly. The row is wrong.",
    negative: "That is certainly the row.",
  },
  {
    id: "furthermore",
    label: "Furthermore",
    pattern: String.raw`\bfurthermore\b`,
    flags: "gi",
    weight: 0.3,
    instead: 'Start a new sentence, or say "also".',
    note: "Low weight. Formal connective that models lean on.",
    example: "Furthermore, the row is wrong.",
    negative: "The further row is wrong.",
  },
  {
    id: "moreover",
    label: "Moreover",
    pattern: String.raw`\bmoreover\b`,
    flags: "gi",
    weight: 0.4,
    instead: 'Say "also", or start a new sentence.',
    note: "Same habit as furthermore, slightly less common in speech.",
    example: "Moreover, the filename still parses.",
    negative: "The more over line wraps.",
  },
];

export interface RawHit {
  id: string;
  start: number;
  end: number;
}

const compiled = TICS.map((tic) => ({
  tic,
  regex: new RegExp(tic.pattern, tic.flags.includes("g") ? tic.flags : `${tic.flags}g`),
}));

export function ticById(id: string): TicDef | undefined {
  return TICS.find((tic) => tic.id === id);
}

/** Non-overlapping hits. At a shared start, the longer match wins. */
export function findTicHits(text: string): RawHit[] {
  const hits: RawHit[] = [];
  for (const { tic, regex } of compiled) {
    regex.lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      if (match.index === undefined) continue;
      hits.push({ id: tic.id, start: match.index, end: match.index + match[0].length });
    }
  }
  hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: RawHit[] = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    kept.push(hit);
    cursor = hit.end;
  }
  return kept;
}

export function countTicHits(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const hit of findTicHits(text)) {
    counts.set(hit.id, (counts.get(hit.id) ?? 0) + 1);
  }
  return counts;
}

/** Replace curated matches with spaces so n-gram discovery does not repeat the catalog. */
export function maskTics(text: string): string {
  const hits = findTicHits(text);
  if (hits.length === 0) return text;
  // RegExp indexes are UTF-16. Our phrases are in the BMP, so slice is correct.
  let out = "";
  let cursor = 0;
  for (const hit of hits) {
    out += text.slice(cursor, hit.start);
    out += " ".repeat(Math.max(0, hit.end - hit.start));
    cursor = hit.end;
  }
  out += text.slice(cursor);
  return out;
}
