const USER_AGENT =
  "SonicoLeagueTasks/1.0 (+https://github.com; Equilibrium League leftover helper for Sonico)";

export async function fetchText(url, { timeoutMs = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/plain, text/html, application/json;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, opts) {
  const text = await fetchText(url, opts);
  return JSON.parse(text);
}
