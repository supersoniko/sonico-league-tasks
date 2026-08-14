import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchTaskCatalog, TIER_POINTS } from "./lib/wiki.js";
import {
  fetchWikiSync,
  computeLeaguePoints,
  UNLOCKED_REGIONS,
  REGION_LABELS,
} from "./lib/player.js";
import { filterAndRankTasks } from "./lib/rank.js";
import { createTtlCache } from "./lib/cache.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = Number(process.env.PORT || 8080);
const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS || 60_000);
const TOP_N = 80;

const cache = createTtlCache(CACHE_TTL_MS);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

async function buildPayload({ force = false } = {}) {
  if (!force) {
    const hit = cache.get();
    if (hit) return { ...hit, cache: "hit" };
  }

  const [tasks, player] = await Promise.all([
    fetchTaskCatalog(),
    fetchWikiSync(),
  ]);

  const ranked = await filterAndRankTasks(tasks, player);
  const top = ranked.slice(0, TOP_N).map((task, index) => ({
    ...task,
    rank: index + 1,
  }));
  const lp = computeLeaguePoints(tasks, player.completed);

  const unlockedTaskCount = tasks.filter((t) =>
    UNLOCKED_REGIONS.has(t.regionKey)
  ).length;

  const payload = {
    player: {
      username: player.username,
      levels: player.levels,
      combatLevel: player.combatLevel,
      totalLevel: player.totalLevel,
      completedCount: player.completed.size,
      leaguePoints: lp,
      unlockedRegions: [...UNLOCKED_REGIONS].map(
        (k) => REGION_LABELS[k] || k
      ),
      wikisyncTimestamp: player.timestamp,
    },
    meta: {
      refreshedAt: new Date().toISOString(),
      cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000),
      catalogSize: tasks.length,
      unlockedCatalogSize: unlockedTaskCount,
      leftoverCount: ranked.length,
      showing: top.length,
      tierPoints: TIER_POINTS,
    },
    tasks: top,
  };

  cache.set(payload);
  return { ...payload, cache: force ? "refreshed" : "miss" };
}

function sendJson(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(data);
}

function sendText(res, status, text, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(text);
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (urlPath === "/") urlPath = "/index.html";
  const safe = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(res, 404, "Not found");
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=300",
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (
      req.method === "GET" &&
      (url.pathname === "/api/tasks" || url.pathname === "/api/refresh")
    ) {
      const force =
        url.pathname === "/api/refresh" || url.searchParams.get("refresh") === "1";
      const payload = await buildPayload({ force });
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    sendText(res, 405, "Method not allowed");
  } catch (err) {
    console.error(err);
    sendJson(res, 502, {
      error: "Failed to build leftover task list",
      detail: String(err?.message || err),
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Sonico league tasks listening on http://0.0.0.0:${PORT}`);
});
