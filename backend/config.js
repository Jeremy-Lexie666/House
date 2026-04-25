const fs = require("fs");
const path = require("path");

const DEFAULT_CHROME_PATHS = [
  process.env.BEIKE_CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/snap/bin/chromium",
].filter(Boolean);

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function toSeedMode(nodeEnv, explicitMode) {
  if (explicitMode === "seed" || explicitMode === "empty") {
    return explicitMode;
  }

  return "empty";
}

function resolveChromePath() {
  const matchedPath = DEFAULT_CHROME_PATHS.find((candidate) => fs.existsSync(candidate));
  return matchedPath || DEFAULT_CHROME_PATHS[0] || "";
}

const NODE_ENV = process.env.NODE_ENV || "development";

const config = {
  nodeEnv: NODE_ENV,
  port: toNumber(process.env.PORT, 8787),
  host: process.env.HOST || "0.0.0.0",
  allowOrigin: process.env.ALLOW_ORIGIN || "*",
  storePath:
    process.env.STORE_PATH || path.join(__dirname, "data", NODE_ENV === "production" ? "store.prod.json" : "store.json"),
  seedMode: toSeedMode(NODE_ENV, process.env.SEED_MODE),
  autoRefreshEnabled: process.env.AUTO_REFRESH_ENABLED === "true",
  autoRefreshHour: toNumber(process.env.AUTO_REFRESH_HOUR, 0),
  autoRefreshMinute: toNumber(process.env.AUTO_REFRESH_MINUTE, 30),
  beikeBrowserEnabled: toBoolean(process.env.BEIKE_BROWSER_ENABLED, NODE_ENV !== "production"),
  beikeBrowserHeadless: toBoolean(process.env.BEIKE_BROWSER_HEADLESS, NODE_ENV === "production"),
  beikeBrowserSessionDir:
    process.env.BEIKE_BROWSER_SESSION_DIR ||
    path.join(__dirname, "data", "browser-session", "beike"),
  beikeChromePath: resolveChromePath(),
};

module.exports = {
  config,
  resolveChromePath,
};
