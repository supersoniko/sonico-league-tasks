/** Infer quest requirements from task fields, including implied Fort Forinthry gates. */

const BLOCKED = [
  "one small favour",
  "horror from the deep",
  "fairy tale",
  "legends'",
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
];

function addQuest(list, seen, name, note, { partial = false, locked = false } = {}) {
  const key = String(name || "").toLowerCase().trim();
  if (!key || seen.has(key)) return;
  seen.add(key);
  list.push({ name, note, partial, locked });
}

export function inferRequiredQuests(task) {
  const quests = [];
  const seen = new Set();

  for (const q of task.quests || []) {
    const locked = BLOCKED.some((b) => q.toLowerCase().includes(b));
    const partial = /partial completion of \{\{QuestIcon\|/i.test(
      task.rawOther || ""
    ) && new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(
      task.rawOther || ""
    );
    addQuest(
      quests,
      seen,
      q,
      locked
        ? "Locked-region quest"
        : partial
          ? "Partial completion listed on task"
          : "Listed on task",
      { locked, partial }
    );
  }

  const hay = `${task.name} ${task.info} ${task.other} ${task.rawOther || ""}`.toLowerCase();

  // Fort Forinthry content implies New Foundations progress
  if (
    /fort forinthry|give bill a beer|workshop at fort|sawmill in fort/i.test(hay)
  ) {
    addQuest(
      quests,
      seen,
      "New Foundations",
      "Partial completion needed for Fort Forinthry access",
      { partial: true }
    );
  }

  if (/lost city/i.test(hay)) {
    addQuest(quests, seen, "Lost City", "Required for Zanaris / cosmic altar access");
  }

  if (/death to the dorgeshuun/i.test(hay)) {
    addQuest(quests, seen, "Death to the Dorgeshuun", "Listed unlock path");
  }

  if (/icthlarin'?s little helper|pyramid plunder/i.test(hay)) {
    addQuest(
      quests,
      seen,
      "Icthlarin's Little Helper",
      "Needed for Sophanem Pyramid Plunder (unconfirmed on WikiSync)",
      { locked: false }
    );
  }

  return quests;
}

/** Score delta: no quests best; partial Misthalin starter mild; full/long demote; locked bury. */
export function scoreDeltaForQuests(quests) {
  if (!quests?.length) return 40;
  let delta = 0;
  for (const q of quests) {
    if (q.locked) delta -= 400;
    else if (q.partial) delta -= 25;
    else delta -= 70;
  }
  return delta;
}
