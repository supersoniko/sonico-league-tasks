const WIKILINK_RE = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/g;

/** Pages that are usually not inventory requirements. */
const NON_ITEM_PATTERNS = [
  /^quest/i,
  /achievements?$/i,
  /task set/i,
  /miniquest/i,
  /diary/i,
  /\baltar\b/i,
  /\bdungeon\b/i,
  /\bcourse\b/i,
  /\bsite\b/i,
  /\bvillage\b/i,
  /\bcity\b/i,
  /\bfort\b/i,
  /\boasis\b/i,
  /\bguild\b/i,
  /\bshop\b/i,
  /\bstore\b/i,
  /\bfarm\b/i,
  /\bwell of souls\b/i,
  /\britual site\b/i,
  /\bdominion tower\b/i,
  /\bfight kiln\b/i,
  /\bpyramid plunder\b/i,
  /\bhavenhythe\b/i,
  /\bmisthalin\b/i,
  /\bkaramja\b/i,
  /\bvarrock\b/i,
  /\blumbridge\b/i,
  /\bmenaphos\b/i,
  /\bwendlewick\b/i,
  /\bbrimhaven\b/i,
  /\bshilo\b/i,
  /\bhet'?s oasis\b/i,
  /\bfort forinthry\b/i,
  /\bcity of um\b/i,
  /\bbill\b/i,
  /\bconjure /i,
  /\bskeleton warrior\b/i,
  /\bzombie\b/i,
  /\bghost\b/i,
  /\blorehound\b/i,
  /\btrader woes\b/i,
  /\bwiz kid\b/i,
  /\bhermit permits\b/i,
  /\bnew foundations\b/i,
  /\blost city\b/i,
  /\bone small favour\b/i,
  /\bdeath to the dorgeshuun\b/i,
  /\bcook'?s assistant\b/i,
  /\btz[tT]ok-?[jj]ad achievements\b/i,
  /\bcombat mastery\b/i,
  /\bhard karamja\b/i,
  /\bvarrock achievements\b/i,
  /\bunderworld achievements\b/i,
  /\bgusting\/?|region\b/i,
];

const EXPLICIT_ITEM_HINT =
  /\b(beer|potion|rune|talisman|tiara|vial|herb|guam|marrentill|newt|berry|berries|ashes|cape|lantern|tokkul|onyx|essence|bucket|milk|plank|nail|charm|pouch|seed|log|ore|bar|hide|feather|eye of)\b/i;

function extractLinks(wikiText) {
  const links = [];
  for (const match of String(wikiText || "").matchAll(WIKILINK_RE)) {
    const page = match[1].trim();
    const label = (match[2] || page).trim();
    links.push({ page, label });
  }
  return links;
}

function looksLikeItem(page, label, { fromOther }) {
  const name = label || page;
  if (!name || name.length < 2) return false;
  if (NON_ITEM_PATTERNS.some((re) => re.test(name) || re.test(page))) {
    return false;
  }
  // File/category noise
  if (/^(file|image|category|template):/i.test(page)) return false;

  if (fromOther) {
    // other= field is usually explicit materials — allow unless blacklisted
    return true;
  }

  // From name/info: only keep if it looks like an item word
  return EXPLICIT_ITEM_HINT.test(name) || EXPLICIT_ITEM_HINT.test(page);
}

/**
 * Infer required items for a task from wiki fields.
 * Prefers explicit `other` materials; adds name/info item links conservatively.
 */
export function inferRequiredItems(task) {
  const items = [];
  const seen = new Set();

  const add = (page, label, source) => {
    const name = (label || page || "").trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    if (!looksLikeItem(page, label, { fromOther: source === "other" })) return;
    seen.add(key);
    items.push({ name, page, source });
  };

  for (const { page, label } of extractLinks(task.rawOther || "")) {
    add(page, label, "other");
  }

  // Plain-text material phrases in other when links are missing
  const otherPlain = String(task.other || "");
  if (/demonic ashes|any demonic ashes|ashes of any kind/i.test(otherPlain)) {
    add("Demonic ashes", "demonic ashes", "other");
  }

  for (const { page, label } of extractLinks(task.rawName || "")) {
    // Skip the product named in "Make/Craft/Equip …" titles
    if (/^(make|craft|equip|drink|catch|harvest|give)\b/i.test(task.name)) {
      const product = (label || page).toLowerCase();
      if (task.name.toLowerCase().includes(product)) continue;
    }
    add(page, label, "name");
  }
  for (const { page, label } of extractLinks(task.rawInfo || "")) {
    add(page, label, "info");
  }

  // Verb heuristics when links are thin
  const hay = `${task.name} ${task.info} ${task.other}`.toLowerCase();
  if (/\bgive bill a beer\b|\ba beer\b/i.test(hay) && !seen.has("beer")) {
    add("Beer", "beer", "heuristic");
  }
  if (/earth tiara or talisman|earth talisman|earth tiara/i.test(hay)) {
    if (!seen.has("earth talisman")) add("Earth talisman", "earth talisman", "heuristic");
  }
  if (/water rune|water altar/i.test(hay) && /craft/i.test(hay)) {
    if (!seen.has("water talisman")) add("Water talisman", "water talisman", "heuristic");
    if (!seen.has("rune essence") && !seen.has("pure essence")) {
      add("Rune essence", "rune essence", "heuristic");
    }
  }
  if (/make an attack potion/i.test(task.name)) {
    add("Clean guam", "clean guam", "heuristic");
    add("Eye of newt", "eye of newt", "heuristic");
    add("Vial of water", "vial of water", "heuristic");
  }
  if (/necromancy potion/i.test(task.name)) {
    add("Clean marrentill", "clean marrentill", "heuristic");
    add("Cadava berries", "cadava berries", "heuristic");
    add("Vial of water", "vial of water", "heuristic");
  }
  if (/make 5 potions of any kind/i.test(task.name)) {
    add("Vial of water", "vial of water", "heuristic");
    add("Clean guam", "clean guam", "heuristic");
    add("Eye of newt", "eye of newt", "heuristic");
  }
  if (/make a 4-dose potion/i.test(task.name)) {
    // wiki lists locked-region tools; keep those as items so ranking can bury/exclude
    add("Botanist's amulet", "botanist's amulet", "heuristic");
  }

  return items;
}
