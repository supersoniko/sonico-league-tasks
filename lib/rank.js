import { TIER_POINTS } from "./wiki.js";
import { UNLOCKED_REGIONS, REGION_LABELS } from "./player.js";

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
 * Ranking hints (boost only if still incomplete + accessible).
 * Higher = easier/faster preference.
 */
const HINT_BOOST = {
  103: 120, // Give Bill a beer
  283: 115, // whirligig
  295: 110, // harvest rose
  598: 108, // karambwanji
  603: 105, // brimhaven stepping stones
  811: 104, // attack potion
  812: 103, // necromancy potion
  807: 102, // make 5 potions
  39: 101, // water rune
  99: 100, // earth altar
  596: 99, // brimhaven ticket
  292: 98, // scarabs
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
  if (task.quests.some((q) => BLOCKED_QUESTS.some((b) => q.toLowerCase().includes(b)))) {
    return true;
  }
  // One Small Favour / Guthix rest style
  if (hay.includes("one small favour") || hay.includes("guthix rest")) return true;
  return false;
}

function inaccessibleExtra(task, levels, combatLevel) {
  if (HARD_EXCLUDE_IDS.has(task.id)) return "pyramid-plunder-quest-unconfirmed";
  if (mentionsBlockedQuest(task)) return "locked-region-quest";

  const name = task.name.toLowerCase();
  const summoning = Number(levels.Summoning || 1);
  const construction = Number(levels.Construction || 1);
  const necromancy = Number(levels.Necromancy || 1);

  // Summoning pouches with Summoning 1
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

  // Generic skill gate already handled; keep name-based safety for deathwarden
  if (/deathwarden|death skull/i.test(name) && necromancy < 20) {
    return "necromancy-too-low";
  }

  return null;
}

function easinessScore(task) {
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

  // Prefer fewer listed skill reqs (already met)
  score -= task.skills.length * 5;

  // Prefer nearby / single-action wording
  if (/\b(one tile|a beer|a rose|a ticket|tiara|talisman)\b/i.test(text)) {
    score += 40;
  }

  // Collection log / clue grind demotion
  if (/collection log|clue scroll|unique items/i.test(text)) score -= 120;

  // Slayer task volume demotion
  if (/slayer task/i.test(text)) score -= 70;

  // Agility laps demotion vs single cross/claim
  if (/laps? of any agility|laps? of the/i.test(text)) score -= 60;

  return score;
}

export function filterAndRankTasks(tasks, player) {
  const { levels, completed, combatLevel } = player;
  const leftovers = [];

  for (const task of tasks) {
    if (!UNLOCKED_REGIONS.has(task.regionKey)) continue;
    if (completed.has(task.id)) continue;
    if (!allSkillsMet(task, levels, combatLevel)) continue;
    const reason = inaccessibleExtra(task, levels, combatLevel);
    if (reason) continue;

    leftovers.push({
      id: task.id,
      name: task.name,
      info: task.info,
      region: REGION_LABELS[task.regionKey] || task.region,
      regionKey: task.regionKey,
      tier: task.tier,
      points: TIER_POINTS[task.tier] || 0,
      skills: task.skills,
      quests: task.quests,
      other: task.other,
      wikiUrl: `https://runescape.wiki/w/Equilibrium_League/Tasks#${task.id}`,
      score: easinessScore(task),
    });
  }

  leftovers.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.points !== b.points) return a.points - b.points;
    return a.id - b.id;
  });

  return leftovers;
}
