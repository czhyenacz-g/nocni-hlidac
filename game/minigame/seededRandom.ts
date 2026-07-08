// Deterministický, injektovatelný RNG (viz zadání "layout placement musí být
// reprodukovatelný podle seedu") — stejný seed vždy vrací stejnou sekvenci
// 0..1 čísel, jiný seed (skoro jistě) jinou. Standardní, kompaktní
// xmur3 (string -> 32bit hash) + mulberry32 (32bit -> stream 0..1) kombinace,
// žádná externí závislost.

export type SeededRandom = () => number;

function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function next() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): SeededRandom {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `createSeededRandom("x")()` vrací vždy stejnou sekvenci pro stejný string `"x"`. */
export function createSeededRandom(seed: string): SeededRandom {
  const seedToUint32 = xmur3(seed);
  return mulberry32(seedToUint32());
}

/** Nedeterministický seed pro skutečnou hru (mimo debug scénáře) — jen když volající žádný seed nedodá, viz EmergencyMiniGame.tsx. */
export function createRandomSeed(): string {
  return `auto-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
