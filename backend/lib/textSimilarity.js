// JS-native equivalent of Python's difflib.SequenceMatcher.ratio(), used by
// scripts/update_profile_from_resume.py's is_near_duplicate() safety net.
// Implemented as bigram (character-pair) Dice coefficient overlap — cheap,
// dependency-free, and close enough for "is this basically the same fact
// worded differently" duplicate detection.

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function bigrams(text) {
  const grams = [];
  for (let i = 0; i < text.length - 1; i++) {
    grams.push(text.slice(i, i + 2));
  }
  return grams;
}

function diceCoefficient(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  if (gramsA.length === 0 || gramsB.length === 0) {
    return a === b ? 1 : 0;
  }
  const countsB = new Map();
  for (const g of gramsB) {
    countsB.set(g, (countsB.get(g) || 0) + 1);
  }
  let matches = 0;
  for (const g of gramsA) {
    const remaining = countsB.get(g) || 0;
    if (remaining > 0) {
      matches++;
      countsB.set(g, remaining - 1);
    }
  }
  return (2 * matches) / (gramsA.length + gramsB.length);
}

export function isNearDuplicate(candidate, existingList, threshold = 0.72) {
  const candNorm = normalize(candidate);
  for (const existing of existingList || []) {
    if (diceCoefficient(candNorm, normalize(existing)) >= threshold) {
      return true;
    }
  }
  return false;
}
