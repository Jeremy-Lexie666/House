const { config } = require("../config");
const { formatNow } = require("../../shared/houseDomain");
const { scrapeBeikeWatchWithBrowser } = require("../sources/beikeBrowser");

const DEFAULT_INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS || 5 * 60 * 1000);
const DEFAULT_MIN_SYNC_INTERVAL_MS = Number(process.env.WORKER_MIN_SYNC_INTERVAL_MS || 15 * 60 * 1000);
const API_BASE_URL = String(process.env.WORKER_API_BASE_URL || "").replace(/\/+$/, "");
const INTERNAL_SYNC_TOKEN = String(process.env.INTERNAL_SYNC_TOKEN || "").trim();
const RUN_ONCE = process.argv.includes("--once");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertEnv() {
  if (!API_BASE_URL) {
    throw new Error("缺少 WORKER_API_BASE_URL");
  }
  if (!INTERNAL_SYNC_TOKEN) {
    throw new Error("缺少 INTERNAL_SYNC_TOKEN");
  }
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 60000);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Sync-Token": INTERNAL_SYNC_TOKEN,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || payload.error || `Request failed with ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function isWatchDue(watchItem) {
  if (!watchItem) {
    return false;
  }
  if (watchItem.syncStatus === "pending") {
    return true;
  }
  if (!watchItem.lastSyncedAt) {
    return true;
  }

  const lastSynced = new Date(watchItem.lastSyncedAt.replace(/-/g, "/")).getTime();
  if (!Number.isFinite(lastSynced)) {
    return true;
  }

  return Date.now() - lastSynced >= DEFAULT_MIN_SYNC_INTERVAL_MS;
}

async function fetchWatchlist() {
  const payload = await request("/api/internal/watchlist");
  return Array.isArray(payload.watchlist) ? payload.watchlist : [];
}

async function uploadResult(result) {
  await request("/api/internal/sync-results", {
    method: "POST",
    body: result,
    timeout: 60000,
  });
}

async function syncWatch(watchItem) {
  const now = formatNow();

  try {
    const result = await scrapeBeikeWatchWithBrowser(watchItem, now, {
      headless: config.beikeBrowserHeadless,
      cdpUrl: config.beikeBrowserCdpUrl,
      userDataDir: config.beikeBrowserSessionDir,
      cookiesPath: config.beikeCookiesPath,
      executablePath: config.beikeChromePath,
      allowInteractiveCaptcha: false,
    });

    await uploadResult({
      watchId: watchItem.id,
      clientId: watchItem.clientId || "",
      sourceType: watchItem.sourceType || "beike",
      sourceUrl: result.meta.communityUrl || watchItem.sourceUrl || "",
      syncStatus: result.properties.length ? "success" : "empty",
      syncError: result.properties.length ? "" : `贝壳页面当前没有抓到符合 ${watchItem.layout} 的房源`,
      syncedAt: now,
      communityName: result.meta.communityName || watchItem.communityName,
      district: result.meta.district || watchItem.district,
      properties: result.properties,
    });

    console.log(`[worker] synced ${watchItem.communityName} ${watchItem.layout}: ${result.properties.length} properties`);
  } catch (error) {
    await uploadResult({
      watchId: watchItem.id,
      clientId: watchItem.clientId || "",
      sourceType: watchItem.sourceType || "beike",
      sourceUrl: watchItem.sourceUrl || "",
      syncStatus: "error",
      syncError: error.message,
      syncedAt: now,
      communityName: watchItem.communityName,
      district: watchItem.district,
      properties: [],
    });

    console.warn(`[worker] failed ${watchItem.communityName} ${watchItem.layout}: ${error.message}`);
  }
}

async function runCycle() {
  const watchlist = await fetchWatchlist();
  const dueWatchlist = watchlist.filter(isWatchDue);

  if (!dueWatchlist.length) {
    console.log("[worker] no watches due");
    return;
  }

  for (const watchItem of dueWatchlist) {
    await syncWatch(watchItem);
  }
}

async function main() {
  assertEnv();

  if (RUN_ONCE) {
    await runCycle();
    return;
  }

  console.log(`[worker] started, interval=${DEFAULT_INTERVAL_MS}ms`);
  while (true) {
    try {
      await runCycle();
    } catch (error) {
      console.error(`[worker] cycle failed: ${error.message}`);
    }
    await sleep(DEFAULT_INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
