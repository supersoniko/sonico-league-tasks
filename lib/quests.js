/**
 * Quest inference + ranking for Equilibrium League leftovers.
 * WikiSync LEAGUE_2 for Sonico has NO quest-completion field — treat all
 * required quests as unknown/incomplete and demote conservatively.
 */

/** Locked-region / unavailable quest name fragments. */
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
  "while guthix sleeps",
  "recipe for disaster",
];

/**
 * Known quest weights when completion is unknown.
 * length: short | medium | long | very_long
 * demote is applied when state is unknown (always, for Sonico today).
 */
const QUEST_META = {
  "new foundations": {
    length: "long",
    note: "Long Fort Forinthry starter (planks, walls, combat) — Misthalin",
  },
  "lost city": {
    length: "medium",
    note: "Medium quest for Zanaris / cosmic altar — Misthalin",
  },
  "death to the dorgeshuun": {
    length: "medium",
    note: "Medium Dorgeshuun quest — Misthalin",
  },
  "jungle potion": {
    length: "short",
    note: "Short Karamja herb quest",
  },
  "shilo village": {
    length: "long",
    note: "Long Karamja quest; gates Shilo Village access",
  },
  "icthlarin's little helper": {
    length: "long",
    note: "Long Desert quest; gates Sophanem / Pyramid Plunder",
  },
  "the jack of spades": {
    length: "medium",
    note: "Gates Menaphos access — Desert",
  },
  "wiz kid": {
    length: "medium",
    note: "Havenhythe quest",
  },
  "hermit permits": {
    length: "medium",
    note: "Havenhythe quest",
  },
  "that old black magic": {
    length: "long",
    note: "Long City of Um / necromancy quest",
  },
  "housing of parliament": {
    length: "long",
    note: "City of Um questline",
  },
  "necromancy!": {
    length: "short",
    note: "Intro necromancy quest for City of Um portal",
  },
  "alpha vs omega": {
    length: "very_long",
    note: "Endgame necromancy quest",
  },
  "'phite club": {
    length: "very_long",
    note: "Long Menaphos quest chain",
  },
  "the vault of shadows": {
    length: "long",
    note: "Archaeology mystery — Desert dig site",
  },
  "cook's assistant": {
    length: "short",
    note: "Short Lumbridge starter quest",
  },
  "sheep shearer (miniquest)": {
    length: "short",
    note: "Short Lumbridge miniquest",
  },
  "tai bwo wannai trio": {
    length: "medium",
    note: "Karamja quest",
  },
  "dragon slayer": {
    length: "long",
    note: "Long quest (Crandor / Karamja path)",
  },
};

const LENGTH_DEMOTE = {
  short: 55,
  medium: 110,
  long: 200,
  very_long: 320,
  unknown: 140,
};

function norm(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/['’]/g, "'")
    .trim();
}

function isBlocked(name) {
  const n = norm(name);
  return BLOCKED.some((b) => n.includes(b));
}

function metaFor(name) {
  const n = norm(name);
  if (QUEST_META[n]) return QUEST_META[n];
  // fuzzy contains
  for (const [key, meta] of Object.entries(QUEST_META)) {
    if (n.includes(key) || key.includes(n)) return meta;
  }
  return {
    length: "unknown",
    note: "Quest length unclear — treated as non-trivial (completion unknown)",
  };
}

function addQuest(
  list,
  seen,
  name,
  {
    partial = false,
    locked = false,
    implied = false,
    noteOverride = null,
  } = {}
) {
  const key = norm(name);
  if (!key) return;
  if (seen.has(key)) {
    // Upgrade note if we learn it is partial/implied
    const existing = list.find((q) => norm(q.name) === key);
    if (existing) {
      if (partial) existing.partial = true;
      if (implied) existing.implied = true;
      if (locked) existing.locked = true;
    }
    return;
  }
  seen.add(key);
  const lockedFlag = locked || isBlocked(name);
  const meta = metaFor(name);
  const noteParts = [];
  if (noteOverride) noteParts.push(noteOverride);
  else noteParts.push(meta.note);
  if (partial) noteParts.push("partial OK");
  if (implied) noteParts.push("implied by content");
  noteParts.push("WikiSync has no quest completion — assume not done");

  list.push({
    name,
    note: noteParts.join(" · "),
    partial,
    implied,
    locked: lockedFlag,
    length: lockedFlag ? "locked" : meta.length,
    status: "unknown",
  });
}

/** Content → quest implications (not only QuestIcon rows). */
function addImpliedQuests(task, quests, seen) {
  const hay = `${task.name} ${task.info} ${task.other} ${task.rawOther || ""} ${task.rawName || ""} ${task.rawInfo || ""}`.toLowerCase();

  if (
    /fort forinthry|give bill a beer|workshop at fort|sawmill in fort|guardhouse in fort|bill a beer/i.test(
      hay
    )
  ) {
    addQuest(quests, seen, "New Foundations", {
      partial: true,
      implied: true,
      noteOverride:
        "Fort Forinthry / Bill requires New Foundations progress (wiki: long)",
    });
  }

  if (/pyramid plunder|sophanem/i.test(hay)) {
    addQuest(quests, seen, "Icthlarin's Little Helper", {
      implied: true,
      noteOverride: "Sophanem / Pyramid Plunder gated by this quest",
    });
  }

  if (/\bmenaphos\b/i.test(hay) && !/het'?s oasis|scarab/i.test(hay)) {
    addQuest(quests, seen, "The Jack of Spades", {
      implied: true,
      noteOverride: "Menaphos access typically needs Jack of Spades",
    });
  }

  if (/shilo village/i.test(hay)) {
    addQuest(quests, seen, "Shilo Village", {
      implied: true,
      noteOverride: "Shilo Village location requires the Shilo Village quest",
    });
    addQuest(quests, seen, "Jungle Potion", {
      implied: true,
      noteOverride: "Prerequisite for Shilo Village quest",
    });
  }

  if (/hardwood grove/i.test(hay)) {
    addQuest(quests, seen, "Jungle Potion", {
      partial: true,
      implied: true,
      noteOverride:
        "Tai Bwo Wannai reputation / sticks — Jungle Potion helps; not free",
    });
  }

  if (/cosmic rune|cosmic altar|zanaris/i.test(hay)) {
    addQuest(quests, seen, "Lost City", {
      implied: true,
      noteOverride: "Zanaris / cosmic altar needs Lost City",
    });
  }

  if (/city of um|well of souls|um ritual/i.test(hay)) {
    addQuest(quests, seen, "Necromancy!", {
      implied: true,
      noteOverride: "City of Um portal starts / needs Necromancy! intro",
    });
  }

  if (/dead beats|that old black magic/i.test(hay)) {
    addQuest(quests, seen, "That Old Black Magic", {
      implied: true,
    });
  }
}

export function inferRequiredQuests(task) {
  const quests = [];
  const seen = new Set();

  for (const q of task.quests || []) {
    const partial =
      /partial completion of \{\{QuestIcon\|/i.test(task.rawOther || "") &&
      new RegExp(
        q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      ).test(task.rawOther || "");
    addQuest(quests, seen, q, {
      partial,
      locked: isBlocked(q),
      noteOverride: partial
        ? `Partial completion listed on task`
        : `Listed on task row`,
    });
  }

  // "Complete the quest: X" in the task name
  const completeMatch = String(task.name || "").match(
    /^Complete the quest:\s*(.+)$/i
  );
  if (completeMatch) {
    addQuest(quests, seen, completeMatch[1].trim(), {
      noteOverride: "Task is the quest itself",
    });
  }

  addImpliedQuests(task, quests, seen);
  return quests;
}

/**
 * Ranking delta. No live quest completion → never treat as free.
 * Partial still costs most of the quest length (you still have to do it).
 */
export function scoreDeltaForQuests(quests) {
  if (!quests?.length) return 50; // no quest gate = boost

  let delta = 0;
  for (const q of quests) {
    if (q.locked || q.length === "locked") {
      delta -= 450;
      continue;
    }
    const base = LENGTH_DEMOTE[q.length] || LENGTH_DEMOTE.unknown;
    // Partial: still most of the work when completion unknown
    const factor = q.partial ? 0.85 : 1;
    delta -= Math.round(base * factor);
  }
  return delta;
}

/** True if task should not get the "instant click" ranking bonus. */
export function hasQuestGate(quests) {
  return Array.isArray(quests) && quests.length > 0;
}
