#!/usr/bin/env node
// shiny_hunt.js — Find legendary buddies with specific eyes, hats, and shiny status
//
// Usage:
//   node shiny_hunt.js <species> [max_attempts]
//
// Examples:
//   node shiny_hunt.js cat              # Search 5M attempts
//   node shiny_hunt.js dragon 20000000  # Search 20M attempts
//
// Outputs every legendary match with full cosmetics,
// then a summary grouped by eye, hat, and shiny count.

const crypto = require("crypto");

const SALT = "friend-2026-401";
const SPECIES = [
  "duck",    "goose",    "blob",     "cat",
  "dragon",  "octopus",  "owl",      "penguin",
  "turtle",  "snail",    "ghost",    "axolotl",
  "capybara","cactus",   "robot",    "rabbit",
  "mushroom","chonk",
];
const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];
const RARITY_WEIGHTS = { common: 60, uncommon: 25, rare: 10, epic: 4, legendary: 1 };
const EYES = ["·", "✦", "×", "◉", "@", "°"];
const HATS = ["none", "crown", "tophat", "propeller", "halo", "wizard", "beanie", "tinyduck"];
const STAT_NAMES = ["DEBUGGING", "PATIENCE", "CHAOS", "WISDOM", "SNARK"];
const RARITY_FLOOR = { common: 5, uncommon: 15, rare: 25, epic: 35, legendary: 50 };

function prng(seed) {
  let K = seed >>> 0;
  return function () {
    K |= 0; K = K + 1831565813 | 0;
    let _ = Math.imul(K ^ K >>> 15, 1 | K);
    _ = _ + Math.imul(_ ^ _ >>> 7, 61 | _) ^ _;
    return ((_ ^ _ >>> 14) >>> 0) / 4294967296;
  };
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(r, a) { return a[Math.floor(r() * a.length)]; }

function rollRarity(r) {
  let roll = r() * 100;
  for (const x of RARITIES) { roll -= RARITY_WEIGHTS[x]; if (roll < 0) return x; }
  return "common";
}

function rollStats(rng, rarity) {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) dump = pick(rng, STAT_NAMES);
  const stats = {};
  for (const name of STAT_NAMES) {
    if (name === peak) stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    else if (name === dump) stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    else stats[name] = floor + Math.floor(rng() * 40);
  }
  return stats;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const target = process.argv[2] || "cat";
const max = parseInt(process.argv[3]) || 5000000;

if (!SPECIES.includes(target)) {
  console.error(`Unknown species: ${target}`);
  console.error(`Valid: ${SPECIES.join(", ")}`);
  process.exit(1);
}

console.log(`Hunting legendary ${target} with full cosmetics (${max.toLocaleString()} attempts)...\n`);

const results = [];

for (let i = 0; i < max; i++) {
  const uid = crypto.randomBytes(32).toString("hex");
  const rng = prng(hash(uid + SALT));
  const rarity = rollRarity(rng);
  if (rarity !== "legendary") continue;
  const species = pick(rng, SPECIES);
  if (species !== target) continue;
  const eye = pick(rng, EYES);
  const hat = pick(rng, HATS);
  const shiny = rng() < 0.01;
  const stats = rollStats(rng, rarity);

  results.push({ eye, hat, shiny, stats, uid });
  const tag = shiny ? " ✨ SHINY!" : "";
  console.log(`  found: eye=${eye} hat=${hat}${tag} -> ${uid}`);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n=== Summary: ${results.length} legendary ${target}s in ${max.toLocaleString()} attempts ===\n`);

const byEye = {};
for (const r of results) byEye[r.eye] = (byEye[r.eye] || 0) + 1;
console.log("Eyes:");
for (const [e, c] of Object.entries(byEye)) console.log(`  ${e}  x${c}`);

const byHat = {};
for (const r of results) byHat[r.hat] = (byHat[r.hat] || 0) + 1;
console.log("\nHats:");
for (const [h, c] of Object.entries(byHat)) console.log(`  ${h}  x${c}`);

const shinyCount = results.filter((r) => r.shiny).length;
console.log(`\nShiny: ${shinyCount}/${results.length}`);

if (shinyCount > 0) {
  console.log("\n=== SHINY LEGENDARY RESULTS ===");
  for (const r of results.filter((r) => r.shiny)) {
    const s = STAT_NAMES.map((n) => `${n}:${r.stats[n]}`).join(" ");
    console.log(`  eye=${r.eye} hat=${r.hat} [${s}] -> ${r.uid}`);
  }
}
