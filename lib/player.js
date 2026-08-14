import { fetchJson } from "./fetch.js";
import { TIER_POINTS } from "./wiki.js";

const WIKISYNC_URL =
  "https://sync.runescape.wiki/runescape/player/Sonico/LEAGUE_2";

/** Unlocked regions for Sonico (wiki keys). */
export const UNLOCKED_REGIONS = new Set([
  "global",
  "misthalin",
  "havenhythe",
  "karamja",
  "desert",
]);

export const REGION_LABELS = {
  global: "Global",
  misthalin: "Misthalin",
  havenhythe: "Havenhythe",
  karamja: "Karamja",
  desert: "Kharidian Desert",
};

/**
 * Approximate RS3 combat level from skill levels.
 * Includes Necromancy as a style option.
 */
export function combatLevelFromSkills(levels) {
  const n = (skill) => Number(levels?.[skill] || 1);
  const defence = n("Defence");
  const constitution = n("Constitution");
  const prayer = n("Prayer");
  const summoning = n("Summoning");
  const attack = n("Attack");
  const strength = n("Strength");
  const magic = n("Magic");
  const ranged = n("Ranged");
  const necromancy = n("Necromancy");

  const base =
    0.25 * (defence + constitution + Math.floor(prayer / 2) + Math.floor(summoning / 2));
  const melee = 0.325 * (attack + strength);
  const mage = 0.325 * (magic * 2);
  const range = 0.325 * (ranged * 2);
  const necro = 0.325 * (necromancy * 2);
  return Math.floor(base + Math.max(melee, mage, range, necro));
}

export async function fetchWikiSync() {
  const data = await fetchJson(WIKISYNC_URL);
  const levels = data.levels || {};
  const completed = new Set(
    (data.league_tasks || []).map((id) => Number(id)).filter(Number.isFinite)
  );
  return {
    username: data.username || "Sonico",
    timestamp: data.timestamp || null,
    levels,
    completed,
    combatLevel: combatLevelFromSkills(levels),
    totalLevel: Object.values(levels).reduce((a, b) => a + Number(b || 0), 0),
  };
}

export function computeLeaguePoints(tasks, completedIds) {
  let lp = 0;
  for (const task of tasks) {
    if (completedIds.has(task.id)) {
      lp += TIER_POINTS[task.tier] || 0;
    }
  }
  return lp;
}

/**
 * Optional hiscores scrape fallback for levels when WikiSync is missing skills.
 * Returns null on failure — WikiSync is preferred.
 */
export async function fetchHiscoresFallback() {
  // Official HTML hiscores page is JS-rendered and unreliable server-side.
  // Keep a stub hook so callers can log that WikiSync was used as primary.
  return null;
}
