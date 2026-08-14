import { TIER_POINTS } from "./wiki.js";
import { UNLOCKED_REGIONS, REGION_LABELS } from "./player.js";
import { inferRequiredItems } from "./items.js";
import {
  resolveMany,
  scoreDeltaForItems,
  ACQ,
  normalizeItemName,
} from "./acquisition.js";
import { inferRequiredQuests, scoreDeltaForQuests } from "./quests.js";

/** Quests that clearly require locked regions / unavailable content. */
const BLOCKED_QUESTS = [
  "one small favour",
  "horror from the deep",
  "fairy tale i",
  "fairy tale ii",
  "legends' quest",
  "legends quest",
  "hero's quest",
  "heroes' quest",
  "desert treasure",
  "throne of miscellania",
  "royal trouble",
  "regicide",
  "roving elves",
  "mourning's end",
  "within the light",
  "plague's end",
  "the temples of lostyn",
];

/** Task IDs known to need unconfirmed / locked access. */
const HARD_EXCLUDE_IDS = new Set([
  // Pyramid Plunder rooms — require Icthlarin's Little Helper; quest state unknown
  285, 286, 287, 296, 297, 298, 299, 300, 301, 302, 303,
]);

/**
 * Soft ranking hints (item scoring still applies on top).
 */
const HINT_BOOST = {
  103: 40, // Bill beer — shop item
  283: 50, // whirligig — no items
  295: 50, // rose — no items
  598: 45, // karambwanji
  603: 45, // stepping stones
  596: 45, // brimhaven ticket
  292: 45, // scarabs
  99: 35, // earth altar — talisman shoppable
  39: 30, // water rune — talisman+essence shoppable
  811: 10, // attack potion — herb gather demotes via items
  812: 10, // necro potion
  807: 0, // make 5 potions — item chain
};

const INSTANT_RE =
  /\b(equip|drink|talk|speak|surge|enter|harvest|claim|give|squish|catch a |make an? |craft a |cross |sit |dance|pray|observe|set sail|use the|open |read |wear )\b/i;

const GRIND_RE =
  /\b(\d{2,}|collection log|unique items|slayer tasks?|laps? of|kill \d|defeat \d|obtain \d|scatter \d|catch \d|complete \d|craft \d{2,}|mine \d|chop \d|smelt \d|smith \d)\b/i;

const LONG_GRIND_RE =
  /\b(collection log|1000|500|250|100 combat|shilo village slayer|boss|raids?|kiln|fight caves|dominion)\b/i;

function skillMet(levels, combatLevel, skill, required) {
  if (skill.toLowerCase() === "combat") {
    return combatLevel >= required;
  }
  const have = Number(levels?.[skill] ?? 0);
  return have >= required;
}

function allSkillsMet(task, levels, combatLevel) {
  return task.skills.every(({ skill, level }) =>
    skillMet(levels, combatLevel, skill, level)
  );
}

function mentionsBlockedQuest(task) {
  const hay = `${task.rawOther} ${task.other} ${task.info} ${task.name}`.toLowerCase();
  if (
    task.quests.some((q) =>
      BLOCKED_QUESTS.some((b) => q.toLowerCase().includes(b))
    )
  ) {
    return true;
  }
  if (hay.includes("one small favour") || hay.includes("guthix rest")) return true;
  return false;
}

function requiresLockedExtraRegion(task) {
  if (!task.requiredRegions?.length) return false;
  return task.requiredRegions.some((r) => {
    const key = r === "kharidian desert" ? "desert" : r;
    return !UNLOCKED_REGIONS.has(key) && key !== "global";
  });
}

function inaccessibleExtra(task, levels, combatLevel) {
  if (HARD_EXCLUDE_IDS.has(task.id)) return "pyramid-plunder-quest-unconfirmed";
  if (mentionsBlockedQuest(task)) return "locked-region-quest";
  if (requiresLockedExtraRegion(task)) return "locked-extra-region";

  const issues = (task.leagueIssues || []).map((x) => x.toLowerCase());
  if (issues.some((x) => x.includes("cannot be completed"))) {
    return "league-cannot-complete";
  }

  const name = task.name.toLowerCase();
  const summoning = Number(levels.Summoning || 1);
  const construction = Number(levels.Construction || 1);
  const necromancy = Number(levels.Necromancy || 1);

  if (
    summoning < 2 &&
    (/\bpouch\b/i.test(task.name) || /\bsummoning pouch\b/i.test(task.info))
  ) {
    return "summoning-locked";
  }

  if (task.id === 63 && necromancy < 20) return "necromancy-too-low";
  if (task.id === 868 && construction < 27) return "construction-too-low";
  if (task.id === 599) {
    if (combatLevel < 100 || Number(levels.Slayer || 0) < 50) {
      return "shilo-slayer-reqs";
    }
  }

  if (/deathwarden|death skull/i.test(name) && necromancy < 20) {
    return "necromancy-too-low";
  }

  return null;
}

function baseEasinessScore(task) {
  const tierBase = {
    easy: 1000,
    medium: 700,
    hard: 400,
    elite: 150,
    master: 50,
  }[task.tier] || 0;

  let score = tierBase;
  score += HINT_BOOST[task.id] || 0;

  const text = `${task.name} ${task.info} ${task.other}`;

  if (INSTANT_RE.test(text) && !GRIND_RE.test(text)) score += 80;
  else if (INSTANT_RE.test(text)) score += 35;

  if (LONG_GRIND_RE.test(text)) score -= 180;
  else if (GRIND_RE.test(text)) score -= 90;

  score -= task.skills.length * 5;

  if (/\b(one tile|a beer|a rose|a ticket)\b/i.test(text)) score += 25;

  if (/collection log|clue scroll|unique items/i.test(text)) score -= 120;
  if (/slayer task/i.test(text)) score -= 70;
  if (/laps? of any agility|laps? of the/i.test(text)) score -= 60;

  return score;
}

function formatItemsForClient(itemResolutions) {
  return itemResolutions.map((item) => ({
    name: item.name,
    method: item.method,
    how: item.how,
    difficulty: item.difficulty,
  }));
}

/**
 * Filter leftovers, resolve item acquisition, rank with item-aware scoring.
 */
export async function filterAndRankTasks(tasks, player) {
  const { levels, completed, combatLevel } = player;
  const candidates = [];

  for (const task of tasks) {
    if (!UNLOCKED_REGIONS.has(task.regionKey)) continue;
    if (completed.has(task.id)) continue;
    if (!allSkillsMet(task, levels, combatLevel)) continue;
    const reason = inaccessibleExtra(task, levels, combatLevel);
    if (reason) continue;

    const requiredItems = inferRequiredItems(task);
    const requiredQuests = inferRequiredQuests(task);
    if (requiredQuests.some((q) => q.locked)) continue;
    candidates.push({ task, requiredItems, requiredQuests });
  }

  const allItemNames = candidates.flatMap((c) =>
    c.requiredItems.map((i) => i.name)
  );
  const resolvedMap = await resolveMany(allItemNames);

  const leftovers = [];
  for (const { task, requiredItems, requiredQuests } of candidates) {
    const itemResolutions = requiredItems.map((item) => {
      const hit =
        resolvedMap.get(normalizeItemName(item.name)) ||
        resolvedMap.get(normalizeItemName(item.page));
      return (
        hit || {
          name: item.name,
          difficulty: ACQ.UNCERTAIN,
          method: "uncertain",
          how: "Acquisition path unresolved",
        }
      );
    });

    // Exclude tasks whose materials need locked regions
    if (itemResolutions.some((i) => i.difficulty === ACQ.LOCKED)) {
      continue;
    }

    const { delta: itemDelta } = scoreDeltaForItems(itemResolutions);
    const questDelta = scoreDeltaForQuests(requiredQuests);
    const score = baseEasinessScore(task) + itemDelta + questDelta;

    leftovers.push({
      id: task.id,
      name: task.name,
      info: task.info,
      region: REGION_LABELS[task.regionKey] || task.region,
      regionKey: task.regionKey,
      tier: task.tier,
      points: TIER_POINTS[task.tier] || 0,
      skills: task.skills,
      quests: requiredQuests,
      other: task.other,
      wikiUrl: `https://runescape.wiki/w/Equilibrium_League/Tasks#${task.id}`,
      score,
      items: formatItemsForClient(itemResolutions),
    });
  }

  leftovers.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.points !== b.points) return a.points - b.points;
    return a.id - b.id;
  });

  return leftovers;
}
