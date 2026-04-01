#!/usr/bin/env node
// verify.js — Check what buddy a given ID produces
//
// Usage:
//   node verify.js <id>
//   node verify.js auto          # reads from ~/.claude.json automatically
//
// Examples:
//   node verify.js da55a6e264a84bb4ab5e68f09dd9f6b096f1394a758d1d3ad603f706cab71bcf
//   node verify.js 5fcd2193-2d37-4c7d-8ef3-0bf369735333
//   node verify.js auto

const fs = require("fs");
const path = require("path");

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

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

function fullRoll(id) {
  const rng = mulberry32(hashString(id + SALT));
  const rarity = rollRarity(rng);
  const species = pick(rng, SPECIES);
  const eye = pick(rng, EYES);
  const hat = rarity === "common" ? "none" : pick(rng, HATS);
  const shiny = rng() < 0.01;
  const stats = rollStats(rng, rarity);
  return { rarity, species, eye, hat, shiny, stats };
}

// ─── Resolve ID ──────────────────────────────────────────────────────────────

let id = process.argv[2];

if (!id || id === "auto") {
  const configPath = path.join(process.env.HOME || "~", ".claude.json");
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const accountUuid = config.oauthAccount?.accountUuid;
    const userID = config.userID;
    const activeId = accountUuid ?? userID ?? "anon";

    console.log("=== ~/.claude.json ===");
    console.log(`  oauthAccount.accountUuid: ${accountUuid ?? "(not set)"}`);
    console.log(`  userID:                   ${userID ?? "(not set)"}`);
    console.log(`  Active ID (used by buddy): ${activeId}`);
    console.log(`  companion:                ${config.companion ? `${config.companion.name} (hatched ${new Date(config.companion.hatchedAt).toISOString()})` : "(none)"}`);
    console.log();

    // Show both if they differ
    if (accountUuid && userID && accountUuid !== userID) {
      console.log("=== accountUuid roll ===");
      const r1 = fullRoll(accountUuid);
      console.log(`  ${r1.rarity} ${r1.species} ${r1.eye} hat:${r1.hat} shiny:${r1.shiny}`);
      console.log(`  stats: ${STAT_NAMES.map((s) => `${s}:${r1.stats[s]}`).join(" ")}`);
      console.log();

      console.log("=== userID roll ===");
      const r2 = fullRoll(userID);
      console.log(`  ${r2.rarity} ${r2.species} ${r2.eye} hat:${r2.hat} shiny:${r2.shiny}`);
      console.log(`  stats: ${STAT_NAMES.map((s) => `${s}:${r2.stats[s]}`).join(" ")}`);
    } else {
      const result = fullRoll(activeId);
      console.log(`=== Active roll ===`);
      console.log(`  ${result.rarity} ${result.species} ${result.eye} hat:${result.hat} shiny:${result.shiny}`);
      console.log(`  stats: ${STAT_NAMES.map((s) => `${s}:${result.stats[s]}`).join(" ")}`);
    }
    process.exit(0);
  } catch (e) {
    console.error(`Cannot read ${configPath}: ${e.message}`);
    process.exit(1);
  }
}

// ─── Manual ID ───────────────────────────────────────────────────────────────

const result = fullRoll(id);
console.log(`ID:      ${id}`);
console.log(`Result:  ${result.rarity} ${result.species}`);
console.log(`Eye:     ${result.eye}`);
console.log(`Hat:     ${result.hat}`);
console.log(`Shiny:   ${result.shiny}`);
console.log(`Stats:   ${STAT_NAMES.map((s) => `${s}:${result.stats[s]}`).join("  ")}`);
