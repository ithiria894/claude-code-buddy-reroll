#!/usr/bin/env node
// reroll.js — Brute-force a Claude Code buddy with your desired species + rarity
//
// Usage:
//   node reroll.js <species> [max_attempts]
//
// Examples:
//   node reroll.js cat              # Find the best cat (up to 500k attempts)
//   node reroll.js dragon 2000000   # Find the best dragon (up to 2M attempts)
//
// Species: duck, goose, blob, cat, dragon, octopus, owl, penguin,
//          turtle, snail, ghost, axolotl, capybara, cactus, robot,
//          rabbit, mushroom, chonk

const crypto = require("crypto");

// ─── Constants (extracted from Claude Code source) ───────────────────────────

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
const RARITY_RANK   = { common: 0,  uncommon: 1,  rare: 2,  epic: 3, legendary: 4 };

// ─── PRNG: Mulberry32 (same as Claude Code) ─────────────────────────────────

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Hash: FNV-1a (same as Claude Code on Node) ─────────────────────────────

function hashString(s) {
  if (typeof Bun !== "undefined") {
    return Number(Bun.hash(s) & 0xFFFFFFFFn);
  }
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Roll helpers ────────────────────────────────────────────────────────────

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function rollRarity(rng) {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const r of RARITIES) {
    roll -= RARITY_WEIGHTS[r];
    if (roll < 0) return r;
  }
  return "common";
}

// ─── Main ────────────────────────────────────────────────────────────────────

const target = process.argv[2] || "duck";
const max = parseInt(process.argv[3]) || 500000;
const mode = process.argv[4] || "hex"; // "hex" for userID, "uuid" for accountUuid

if (!SPECIES.includes(target)) {
  console.error(`Unknown species: ${target}`);
  console.error(`Valid: ${SPECIES.join(", ")}`);
  process.exit(1);
}

function randomHex() {
  return crypto.randomBytes(32).toString("hex");
}

function randomUUID() {
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

console.log(`Searching for legendary ${target} (mode: ${mode}, max: ${max.toLocaleString()})...\n`);

let best = { rarity: "common", id: "" };

for (let i = 0; i < max; i++) {
  const id = mode === "uuid" ? randomUUID() : randomHex();
  const rng = mulberry32(hashString(id + SALT));
  const rarity = rollRarity(rng);
  const species = pick(rng, SPECIES);

  if (species === target && RARITY_RANK[rarity] > RARITY_RANK[best.rarity]) {
    best = { rarity, id };
    console.log(`  found: ${rarity} ${species} -> ${id}`);
    if (rarity === "legendary") break;
  }
}

console.log(`\nBest: ${best.rarity} ${target} -> ${best.id}`);

if (best.rarity === "legendary") {
  console.log("\nTo apply, see README.md for instructions.");
}
