const fs = require("fs");
const path = require("path");
const { state: seedState } = require("../data/mock");
const { config } = require("./config");

const STORE_PATH = path.resolve(process.cwd(), config.storePath);

function createInitialState() {
  if (config.seedMode === "empty") {
    return {
      lastRefreshedAt: "",
      refreshCount: 0,
      watchlist: [],
      properties: [],
    };
  }

  return seedState;
}

function ensureStoreFile() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify(createInitialState(), null, 2));
  }
}

function loadState() {
  ensureStoreFile();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function saveState(state) {
  ensureStoreFile();
  fs.writeFileSync(STORE_PATH, JSON.stringify(state, null, 2));
}

module.exports = {
  createInitialState,
  loadState,
  saveState,
  STORE_PATH,
};
