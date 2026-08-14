import { fetchJson } from "./fetch.js";

const UNLOCKED_SHOP_REGIONS = new Set([
  "misthalin",
  "havenhythe",
  "karamja",
  "desert",
]);

/** Difficulty: lower is easier/faster in leagues. */
export const ACQ = {
  NONE: 0,
  SHOP: 1,
  SPAWN_OR_PICK: 2,
  GATHER: 3,
  CRAFT: 4,
  MULTI: 5,
  CURRENCY_GRIND: 6,
  RARE: 7,
  UNCERTAIN: 8,
  LOCKED: 9,
};

/**
 * Curated league-legal paths for Sonico's unlocked regions.
 * Prefer these over live lookup when present (verified against wiki shops/spawns).
 * Ironman + infinite shop stock; no GE.
 */
const CURATED = {
  beer: {
    difficulty: ACQ.SHOP,
    method: "shop",
    how: "Buy at Blue Moon Inn / Dancing Donkey (Varrock) or Zembo (Musa Point)",
  },
  "eye of newt": {
    difficulty: ACQ.SHOP,
    method: "shop",
    how: "Buy at Granny Rowan's Supplies (Fort Forinthry)",
  },
  vial: {
    difficulty: ACQ.SHOP,
    method: "shop",
    how: "Buy at Granny Rowan's Supplies (Fort Forinthry) or Obli/Jiminua (Karamja)",
  },
  "vial of water": {
    difficulty: ACQ.SHOP,
    method: "shop",
    how: "Buy at Granny Rowan's Supplies (Fort Forinthry) or Obli/Jiminua (Karamja)",
  },
  "pestle and mortar": {
    difficulty: ACQ.SHOP,
    method: "shop",
    how: "Buy at Jiminua's Jungle Store (Tai Bwo Wannai) or Obli (Shilo)",
  },
  "bucket of milk": {
    difficulty: ACQ.SHOP,
    method: "shop",
    how: "Buy at Rodney's (Fort Forinthry) or Village Grocery (Wendlewick) — not Culinaromancer's Chest (Recipe for Disaster)",
  },
  // RC guild / Elriss: token shop; ironmen cannot buy talismans/essence/most teleports (wiki)
  "earth talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss (ironman-blocked). Drop from giant spiders (e.g. Lumbridge Swamp, Misthalin)",
  },
  "water talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss (ironman-blocked). Drop from dark wizards (Varrock stone circle, Misthalin)",
  },
  "air talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss. Monster drop / clue — no coin shop in unlocked regions",
  },
  "fire talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss. Monster drop (e.g. dark wizards) — no coin shop path",
  },
  "mind talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss. Monster drop — no coin shop path",
  },
  "body talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss. Monster drop — no coin shop path",
  },
  "cosmic talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss. Rare drop; Lost City for cosmic altar",
  },
  "chaos talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss. Rare drop — no coin shop path",
  },
  "nature talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss. Rare drop — no coin shop path",
  },
  "law talisman": {
    difficulty: ACQ.RARE,
    method: "drop",
    how: "NOT Elriss. Rare drop — no coin shop path",
  },
  "rune essence": {
    difficulty: ACQ.GATHER,
    method: "mine",
    how: "NOT Elriss (ironman-blocked). Mine via Aubury teleport to essence mine (Varrock)",
  },
  "pure essence": {
    difficulty: ACQ.GATHER,
    method: "mine",
    how: "NOT Elriss (ironman-blocked). Mine via Aubury (members essence) — Varrock",
  },
  "wicked hood": {
    difficulty: ACQ.LOCKED,
    method: "locked",
    how: "Free hood is from Tam McGrubor (Burthorpe / Asgarnia — locked). Still needs talismans fed for altars",
  },
  "earth tiara": {
    difficulty: ACQ.MULTI,
    method: "craft",
    how: "Craft at earth altar (silver tiara + earth talisman drop) — talisman is a grind",
  },
  "water tiara": {
    difficulty: ACQ.MULTI,
    method: "craft",
    how: "Craft at water altar (silver tiara + water talisman drop) — talisman is a grind",
  },
  tiara: {
    difficulty: ACQ.CRAFT,
    method: "craft",
    how: "Craft from silver bar + tiara mould (smithing)",
  },
  "clean guam": {
    difficulty: ACQ.GATHER,
    method: "gather",
    how: "Clean grimy guam (farm herb patch / monster drops) — not shop-bought",
  },
  "grimy guam": {
    difficulty: ACQ.GATHER,
    method: "gather",
    how: "Farm guam seeds in a herb patch or loot monster drops",
  },
  "guam leaf": {
    difficulty: ACQ.GATHER,
    method: "gather",
    how: "Same as clean guam — farm/loot then clean",
  },
  guam: {
    difficulty: ACQ.GATHER,
    method: "gather",
    how: "Farm/loot grimy guam, then clean",
  },
  "clean marrentill": {
    difficulty: ACQ.GATHER,
    method: "gather",
    how: "Clean grimy marrentill (farm herb patch / drops) — not shop-bought",
  },
  "grimy marrentill": {
    difficulty: ACQ.GATHER,
    method: "gather",
    how: "Farm marrentill seeds or loot monster drops",
  },
  marrentill: {
    difficulty: ACQ.GATHER,
    method: "gather",
    how: "Farm/loot grimy marrentill, then clean",
  },
  "cadava berries": {
    difficulty: ACQ.SPAWN_OR_PICK,
    method: "gather",
    how: "Pick from cadava bushes south-east of Varrock (Misthalin)",
  },
  "obsidian cape": {
    difficulty: ACQ.CURRENCY_GRIND,
    method: "shop",
    how: "Buy from TzHaar-Hur-Tel (TzHaar City) for Tokkul — need Tokkul grind",
  },
  tokkul: {
    difficulty: ACQ.CURRENCY_GRIND,
    method: "grind",
    how: "Earn from TzHaar combat / activities in Karamja",
  },
  "fire cape": {
    difficulty: ACQ.RARE,
    method: "activity",
    how: "Earn from Fight Caves (TzTok-Jad) — long activity",
  },
  "morytania legs 4": {
    difficulty: ACQ.LOCKED,
    method: "locked",
    how: "Requires Morytania (locked region)",
  },
  "underworld grimoire 1": {
    difficulty: ACQ.MULTI,
    method: "uncertain",
    how: "Underworld achievement reward — longer unlock path",
  },
  "botanist's amulet": {
    difficulty: ACQ.CURRENCY_GRIND,
    method: "uncertain",
    how: "Herblore Habitats / rewards — not a simple unlocked shop buy",
  },
  varanusaur: {
    difficulty: ACQ.LOCKED,
    method: "locked",
    how: "Anachronia Dinosaur Farm (locked region)",
  },
  "farm totem": {
    difficulty: ACQ.LOCKED,
    method: "locked",
    how: "Tied to Anachronia farm content (locked)",
  },
  "anachronia dinosaur farm": {
    difficulty: ACQ.LOCKED,
    method: "locked",
    how: "Anachronia (locked region)",
  },
  "uncut onyx": {
    difficulty: ACQ.CURRENCY_GRIND,
    method: "shop",
    how: "TzHaar gem store for huge Tokkul, or Fight Kiln — heavy grind",
  },
  "uncut dragonstone": {
    difficulty: ACQ.RARE,
    method: "uncertain",
    how: "Rare gem — no simple unlocked shop path assumed",
  },
  "demonic ashes": {
    difficulty: ACQ.GATHER,
    method: "drop",
    how: "Loot ashes from demons (e.g. greater demons on Karamja)",
  },
  "impious ashes": {
    difficulty: ACQ.GATHER,
    method: "drop",
    how: "Loot from imps / low demons",
  },
  "bullseye lantern": {
    difficulty: ACQ.MULTI,
    method: "craft",
    how: "Craft/fill lantern — multi-step; check quest shop unlocks carefully",
  },
  "water rune": {
    difficulty: ACQ.MULTI,
    method: "craft",
    how: "Craft at Water Altar: mine essence (Aubury) + water talisman/tiara (dark wizard drops) — not Elriss",
  },
  "earth rune": {
    difficulty: ACQ.MULTI,
    method: "craft",
    how: "Craft at Earth Altar: mine essence (Aubury) + earth talisman/tiara (spider drops) — not Elriss",
  },
  "runecrafting guild token": {
    difficulty: ACQ.CURRENCY_GRIND,
    method: "grind",
    how: "Great Orb Project tokens — not coins; guild needs 50 Runecrafting",
  },
  "runecrafting guild tokens": {
    difficulty: ACQ.CURRENCY_GRIND,
    method: "grind",
    how: "Great Orb Project tokens — not coins; guild needs 50 Runecrafting",
  },
  "blood altar teleport": {
    difficulty: ACQ.CURRENCY_GRIND,
    method: "shop",
    how: "Only RC guild teleport ironmen can buy (tokens + 50 RC) — still not free",
  },
  "air altar teleport": {
    difficulty: ACQ.LOCKED,
    method: "ironman-blocked",
    how: "Elriss altar teleports (except blood) are ironman-blocked",
  },
  "water altar teleport": {
    difficulty: ACQ.LOCKED,
    method: "ironman-blocked",
    how: "Elriss altar teleports (except blood) are ironman-blocked",
  },
  "earth altar teleport": {
    difficulty: ACQ.LOCKED,
    method: "ironman-blocked",
    how: "Elriss altar teleports (except blood) are ironman-blocked",
  },
  "attack potion": {
    difficulty: ACQ.MULTI,
    method: "craft",
    how: "Brew: vial of water + clean guam + eye of newt",
  },
  "necromancy potion": {
    difficulty: ACQ.MULTI,
    method: "craft",
    how: "Brew: vial of water + clean marrentill + cadava berries",
  },
};

const itemCache = new Map();

function norm(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/['’]/g, "'")
    .trim();
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&#91;/g, "[")
    .replace(/&#93;/g, "]")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanCell(html) {
  return decodeEntities(
    String(html || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function parseShopRows(html) {
  const section = String(html || "");
  const ironmanBlockedSection = /not available to\s+ironman/i.test(section);
  const rows = [...section.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((m) => m[0]);
  const shops = [];
  for (const row of rows.slice(1)) {
    const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
      (m) => cleanCell(m[1])
    );
    if (cells.length < 2) continue;
    const seller = cells[0];
    const location = cells[1];
    const price = cells[3] || "";
    const region = (cells[cells.length - 1] || "").replace(/✓/g, "").trim();
    if (!seller || /^seller$/i.test(seller)) continue;
    const blob = `${seller} ${location} ${price}`.toLowerCase();
    const citesIronmanNote =
      ironmanBlockedSection && /\[?\s*sl\s*\d+\s*\]?|cite/i.test(row);
    shops.push({
      seller,
      location,
      price,
      region,
      blob,
      ironmanBlocked: citesIronmanNote || isBlockedShopBlob(blob),
      nonCoinCurrency: isNonCoinShopBlob(blob, price),
    });
  }
  return shops;
}

/** Token / minigame / ironman-blocked shop name patterns. */
function isBlockedShopBlob(blob) {
  return (
    /elriss|runecrafting guild rewards|great orb project|runecrafting guild token/.test(
      blob
    ) ||
    /culinaromancer/.test(blob) || // Recipe for Disaster gated
    /wizard rinsit|runespan point|wizard finix'?s runecrafting shop/.test(blob)
  );
}

function isNonCoinShopBlob(blob, price) {
  if (/tokkul|runecrafting guild token|fishing token|thaler|reaper point|dungoneering token|dungeoneering token|runespan point|contribution point|zeal|pest control|void knight|castle war|ticket/.test(blob)) {
    return true;
  }
  // Price cell that is clearly not gp (e.g. "50" with token shop already caught)
  if (/token/i.test(String(price))) return true;
  return false;
}

function isUnlockedRegionName(region) {
  const r = String(region || "").toLowerCase();
  if (!r) return false;
  if (r.includes("kharidian")) return true;
  return [...UNLOCKED_SHOP_REGIONS].some((key) => r.includes(key));
}

function preferShop(shops) {
  const unlocked = shops.filter(
    (s) =>
      isUnlockedRegionName(s.region) &&
      !s.ironmanBlocked &&
      !s.nonCoinCurrency &&
      !isBlockedShopBlob(s.blob)
  );
  if (!unlocked.length) return null;
  // Prefer coin shops in named unlocked cities — never boost Elriss
  const scored = unlocked
    .map((s) => {
      let score = 0;
      const blob = s.blob;
      if (
        /varrock|lumbridge|alkharid|al kharid|fort forinthry|brimhaven|wendlewick|shilo|tai bwo|tzhaar|musa/.test(
          blob
        )
      ) {
        score += 5;
      }
      if (/granny rowan|blue moon|dancing donkey|obli|jiminua|zembo|rodney/.test(blob)) {
        score += 3;
      }
      if (/elriss|runecrafting guild/.test(blob)) score -= 100;
      if (/∞|inf/i.test(String(s.price)) || /∞/.test(blob)) score += 1;
      // Prefer explicit low gp prices over mysterious currencies
      if (/^\d[\d,]*$/.test(String(s.price).trim()) || /gp/i.test(String(s.price))) {
        score += 2;
      }
      return { s, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored[0].s;
}

function formatShopHow(shop) {
  const seller = shop.seller.replace(/\s*Shop:\s*/i, " — ");
  const loc = shop.location;
  const region = shop.region.replace(/\s+/g, " ").trim();
  const price =
    shop.price && shop.price !== "N/A" ? ` (${shop.price} gp)` : "";
  return `Buy from ${seller} in ${loc} [${region}]${price} — league coin shop (refills)`;
}

async function fetchWikiShops(itemName) {
  const page = itemName;
  try {
    const sectionsData = await fetchJson(
      `https://runescape.wiki/api.php?${new URLSearchParams({
        action: "parse",
        page,
        prop: "sections",
        format: "json",
      })}`
    );
    const sections = sectionsData?.parse?.sections || [];
    const shopSec = sections.find(
      (s) => String(s.line || "").toLowerCase() === "shop locations"
    );
    if (!shopSec) return [];
    const htmlData = await fetchJson(
      `https://runescape.wiki/api.php?${new URLSearchParams({
        action: "parse",
        page,
        prop: "text",
        section: String(shopSec.index),
        format: "json",
      })}`
    );
    return parseShopRows(htmlData?.parse?.text?.["*"] || "");
  } catch {
    return [];
  }
}

/**
 * Resolve acquisition for one item name.
 */
export async function resolveAcquisition(itemName) {
  const key = norm(itemName);
  if (!key) {
    return {
      name: itemName,
      difficulty: ACQ.NONE,
      method: "none",
      how: "No item needed",
    };
  }
  if (itemCache.has(key)) return itemCache.get(key);

  if (CURATED[key]) {
    const result = { name: itemName, ...CURATED[key] };
    itemCache.set(key, result);
    return result;
  }

  const shops = await fetchWikiShops(itemName);
  const best = preferShop(shops);
  if (best) {
    // Tokkul / similar still demote even if preferShop allowed TzHaar coin-like
    if (best.nonCoinCurrency || /tokkul/i.test(best.blob)) {
      const result = {
        name: itemName,
        difficulty: ACQ.CURRENCY_GRIND,
        method: "shop",
        how: `${formatShopHow(best)} — non-coin currency grind`,
      };
      itemCache.set(key, result);
      return result;
    }
    const result = {
      name: itemName,
      difficulty: ACQ.SHOP,
      method: "shop",
      how: formatShopHow(best),
    };
    itemCache.set(key, result);
    return result;
  }

  // Only invalid / locked shops remain
  const blocked = shops.filter(
    (s) => s.ironmanBlocked || s.nonCoinCurrency || isBlockedShopBlob(s.blob)
  );
  const unlockedBlocked = blocked.filter((s) => isUnlockedRegionName(s.region));
  if (unlockedBlocked.length) {
    const s = unlockedBlocked[0];
    const reason = s.ironmanBlocked
      ? "ironman-blocked / minigame-token shop (e.g. Elriss)"
      : "non-coin / restricted shop";
    const result = {
      name: itemName,
      difficulty: ACQ.RARE,
      method: "no-valid-shop",
      how: `Wiki lists ${s.seller} but ${reason} — need drop/mine/craft instead (uncertain grind)`,
    };
    itemCache.set(key, result);
    return result;
  }

  if (shops.length) {
    const locked = shops[0];
    const result = {
      name: itemName,
      difficulty: ACQ.LOCKED,
      method: "locked-shop",
      how: `Shop exists only in locked region(s) (e.g. ${locked.region}) — not league-easy`,
    };
    itemCache.set(key, result);
    return result;
  }

  // Conservative: unknown non-shop item
  const result = {
    name: itemName,
    difficulty: ACQ.UNCERTAIN,
    method: "uncertain",
    how: "No unlocked-region coin shop found — gather/craft/drop path uncertain",
  };
  itemCache.set(key, result);
  return result;
}

export async function resolveMany(itemNames) {
  const unique = [];
  const seen = new Set();
  for (const name of itemNames) {
    const key = norm(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(name);
  }

  const out = new Map();
  // modest concurrency
  const queue = [...unique];
  const workers = Array.from({ length: Math.min(4, queue.length || 1) }, async () => {
    while (queue.length) {
      const name = queue.shift();
      out.set(norm(name), await resolveAcquisition(name));
    }
  });
  await Promise.all(workers);
  return out;
}

export function scoreDeltaForItems(itemResolutions) {
  if (!itemResolutions?.length) {
    return { delta: 90, worst: ACQ.NONE }; // no items = easy boost
  }

  let delta = 0;
  let worst = ACQ.NONE;
  for (const item of itemResolutions) {
    worst = Math.max(worst, item.difficulty);
    switch (item.difficulty) {
      case ACQ.SHOP:
      case ACQ.SPAWN_OR_PICK:
        delta += 55;
        break;
      case ACQ.GATHER:
        delta -= 25;
        break;
      case ACQ.CRAFT:
        delta -= 45;
        break;
      case ACQ.MULTI:
        delta -= 90;
        break;
      case ACQ.CURRENCY_GRIND:
        delta -= 140;
        break;
      case ACQ.RARE:
        delta -= 180;
        break;
      case ACQ.UNCERTAIN:
        delta -= 70;
        break;
      case ACQ.LOCKED:
        delta -= 400;
        break;
      default:
        break;
    }
  }

  // Extra penalty for multiple gathered/crafted ingredients
  const hardBits = itemResolutions.filter((i) => i.difficulty >= ACQ.GATHER).length;
  if (hardBits >= 2) delta -= 40;

  return { delta, worst };
}

export { CURATED, norm as normalizeItemName };
