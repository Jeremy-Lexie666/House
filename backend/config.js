const path = require("path");

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSeedMode(nodeEnv, explicitMode) {
  if (explicitMode === "seed" || explicitMode === "empty") {
    return explicitMode;
  }

  return nodeEnv === "production" ? "empty" : "seed";
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
};

module.exports = {
  config,
};
