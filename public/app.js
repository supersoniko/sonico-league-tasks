const state = {
  tasks: [],
  region: "all",
  tier: "all",
};

const el = {
  list: document.getElementById("task-list"),
  empty: document.getElementById("empty"),
  error: document.getElementById("error"),
  completed: document.getElementById("stat-completed"),
  total: document.getElementById("stat-total"),
  lp: document.getElementById("stat-lp"),
  left: document.getElementById("stat-left"),
  meta: document.getElementById("refresh-meta"),
  regions: document.getElementById("regions"),
  refresh: document.getElementById("refresh-btn"),
  regionFilters: document.getElementById("region-filters"),
  tierFilters: document.getElementById("tier-filters"),
};

function formatTime(iso) {
  if (!iso) return "unknown";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function skillText(skills) {
  if (!skills?.length) return "No skill requirements listed";
  return skills.map((s) => `${s.skill} ${s.level}`).join(" · ");
}

function itemsBlock(items) {
  if (!items?.length) {
    return `<p class="items none">Items: none</p>`;
  }
  const rows = items
    .map(
      (item) =>
        `<li><span class="item-name">${escapeHtml(item.name)}</span> — ${escapeHtml(
          item.how
        )}</li>`
    )
    .join("");
  return `<div class="items"><p class="items-label">Items</p><ul>${rows}</ul></div>`;
}

function questsBlock(quests) {
  if (!quests?.length) {
    return `<p class="quests none">Quests: none</p>`;
  }
  const rows = quests
    .map((q) => {
      const tag = q.partial ? " (partial)" : "";
      const note = q.note ? ` — ${escapeHtml(q.note)}` : "";
      return `<li><span class="quest-name">${escapeHtml(q.name)}${tag}</span>${note}</li>`;
    })
    .join("");
  return `<div class="quests"><p class="quests-label">Quests</p><ul>${rows}</ul></div>`;
}

function renderFilters(tasks) {
  const regions = [...new Set(tasks.map((t) => t.regionKey))].sort();
  const tiers = ["easy", "medium", "hard", "elite", "master"].filter((t) =>
    tasks.some((x) => x.tier === t)
  );

  el.regionFilters.innerHTML = "";
  el.tierFilters.innerHTML = "";

  const makeChip = (label, value, group, current) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = label;
    btn.setAttribute("aria-pressed", String(current === value));
    btn.addEventListener("click", () => {
      state[group] = value;
      renderFilters(state.tasks);
      renderList();
    });
    return btn;
  };

  el.regionFilters.append(
    makeChip("All regions", "all", "region", state.region),
    ...regions.map((r) => {
      const label = tasks.find((t) => t.regionKey === r)?.region || r;
      return makeChip(label, r, "region", state.region);
    })
  );

  el.tierFilters.append(
    makeChip("All tiers", "all", "tier", state.tier),
    ...tiers.map((t) => makeChip(t, t, "tier", state.tier))
  );
}

function filteredTasks() {
  return state.tasks.filter((t) => {
    if (state.region !== "all" && t.regionKey !== state.region) return false;
    if (state.tier !== "all" && t.tier !== state.tier) return false;
    return true;
  });
}

function renderList() {
  const tasks = filteredTasks();
  el.list.innerHTML = "";
  el.empty.hidden = tasks.length > 0;

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    li.className = "task";
    li.style.animationDelay = `${Math.min(index, 12) * 28}ms`;
    li.innerHTML = `
      <div class="rank">${task.rank}</div>
      <div>
        <h2>${escapeHtml(task.name)}</h2>
        <div class="meta">
          <span class="badge region">${escapeHtml(task.region)}</span>
          <span class="badge tier-${escapeHtml(task.tier)}">${escapeHtml(task.tier)}</span>
          <span class="badge points">${task.points} pts</span>
        </div>
        <p class="how">${escapeHtml(task.info || task.name)}</p>
        <p class="skills">${escapeHtml(skillText(task.skills))}${
          task.other ? ` · ${escapeHtml(task.other)}` : ""
        }</p>
        ${itemsBlock(task.items)}
        ${questsBlock(task.quests)}
        <a class="wiki" href="${escapeAttr(task.wikiUrl)}" target="_blank" rel="noopener noreferrer">Wiki task #${task.id}</a>
      </div>
    `;
    el.list.appendChild(li);
  });
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(str) {
  return escapeHtml(str).replaceAll("'", "&#39;");
}

function renderMeta(data) {
  const { player, meta } = data;
  el.completed.textContent = String(player.completedCount);
  el.total.textContent = String(player.totalLevel);
  el.lp.textContent = String(player.leaguePoints);
  el.left.textContent = String(meta.leftoverCount);
  el.regions.textContent = `Unlocked: ${player.unlockedRegions.join(" · ")}`;
  el.meta.textContent = `Last refresh ${formatTime(meta.refreshedAt)} · WikiSync ${formatTime(
    player.wikisyncTimestamp
  )} · cache ${data.cache}`;
}

async function load({ force = false } = {}) {
  el.error.hidden = true;
  el.refresh.disabled = true;
  el.meta.textContent = force ? "Refreshing live data…" : "Loading live WikiSync…";
  try {
    const url = force ? "/api/refresh" : "/api/tasks";
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || res.statusText);
    state.tasks = data.tasks || [];
    renderMeta(data);
    renderFilters(state.tasks);
    renderList();
  } catch (err) {
    el.error.hidden = false;
    el.error.textContent = `Could not load tasks: ${err.message || err}`;
  } finally {
    el.refresh.disabled = false;
  }
}

el.refresh.addEventListener("click", () => load({ force: true }));
load();
