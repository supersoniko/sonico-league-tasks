import { fetchText } from "./fetch.js";

const TASKS_RAW_URL =
  "https://runescape.wiki/w/Equilibrium_League/Tasks?action=raw";

const SKILLREQ_RE = /\{\{Skillreq\|([^|}]+)\|(\d+)\}\}/gi;
const QUESTICON_RE = /\{\{QuestIcon\|([^}]+)\}\}/gi;
const WIKILINK_RE = /\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g;

function extractTemplates(text, name) {
  const marker = `{{${name}|`;
  const results = [];
  let i = 0;
  while (true) {
    const start = text.indexOf(marker, i);
    if (start < 0) break;
    let depth = 0;
    let j = start;
    let closed = false;
    while (j < text.length - 1) {
      if (text.slice(j, j + 2) === "{{") {
        depth += 1;
        j += 2;
      } else if (text.slice(j, j + 2) === "}}") {
        depth -= 1;
        j += 2;
        if (depth === 0) {
          results.push(text.slice(start + 2, j - 2));
          i = j;
          closed = true;
          break;
        }
      } else {
        j += 1;
      }
    }
    if (!closed) break;
  }
  return results;
}

function splitParams(body) {
  const prefix = "League2TaskRow|";
  const content = body.startsWith(prefix) ? body.slice(prefix.length) : body;
  const parts = [];
  let cur = "";
  let depth = 0;
  for (let k = 0; k < content.length; ) {
    if (content.slice(k, k + 2) === "{{") {
      depth += 1;
      cur += "{{";
      k += 2;
    } else if (content.slice(k, k + 2) === "}}") {
      depth = Math.max(0, depth - 1);
      cur += "}}";
      k += 2;
    } else if (content[k] === "|" && depth === 0) {
      parts.push(cur);
      cur = "";
      k += 1;
    } else {
      cur += content[k];
      k += 1;
    }
  }
  parts.push(cur);
  return parts;
}

function stripWiki(text) {
  return String(text || "")
    .replace(WIKILINK_RE, "$1")
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/'''?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseSkills(s) {
  const skills = [];
  for (const match of String(s || "").matchAll(SKILLREQ_RE)) {
    skills.push({ skill: match[1].trim(), level: Number(match[2]) });
  }
  return skills;
}

function parseQuests(other) {
  return [...String(other || "").matchAll(QUESTICON_RE)].map((m) =>
    m[1].trim()
  );
}

export function parseTaskCatalog(raw) {
  const rows = extractTemplates(raw, "League2TaskRow");
  const tasks = [];

  for (const row of rows) {
    const parts = splitParams(row);
    const name = (parts[0] || "").trim();
    const info = (parts[1] || "").trim();
    const meta = {};
    for (const part of parts.slice(2)) {
      const eq = part.indexOf("=");
      if (eq < 0) continue;
      meta[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    }

    const id = Number(meta.id);
    if (!Number.isFinite(id)) continue;

    const skills = parseSkills(meta.s);
    const quests = parseQuests(meta.other);
    const howTo = stripWiki(info) || stripWiki(name);

    tasks.push({
      id,
      name: stripWiki(name),
      info: howTo,
      region: meta.region || "Unknown",
      regionKey: String(meta.region || "unknown").toLowerCase(),
      tier: String(meta.tier || "unknown").toLowerCase(),
      skills,
      quests,
      other: stripWiki(meta.other || ""),
      rawOther: meta.other || "",
    });
  }

  return tasks;
}

export async function fetchTaskCatalog() {
  const raw = await fetchText(TASKS_RAW_URL);
  return parseTaskCatalog(raw);
}

export const TIER_POINTS = {
  easy: 10,
  medium: 30,
  hard: 80,
  elite: 200,
  master: 400,
};
