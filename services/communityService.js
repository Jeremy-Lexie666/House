const { state: seedState } = require("../data/mock");
const { loadState, saveState } = require("../utils/storage");
const {
  deleteWatchItem: deleteWatchItemFromState,
  getHomeFeed: getHomeFeedFromState,
  getPropertyDetail: getPropertyDetailFromState,
  getWatchItem: getWatchItemFromState,
  getWatchlist: getWatchlistFromState,
  refreshState,
  upsertWatchItem: upsertWatchItemToState,
} = require("../shared/houseDomain");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureState() {
  const cached = loadState();
  if (cached && cached.watchlist && cached.properties) {
    return cached;
  }
  const seeded = clone(seedState);
  saveState(seeded);
  return seeded;
}

function getHomeFeed() {
  const state = ensureState();
  return getHomeFeedFromState(state);
}

function getPropertyDetail(id) {
  const state = ensureState();
  return getPropertyDetailFromState(state, id);
}

function getWatchlist() {
  const state = ensureState();
  return getWatchlistFromState(state);
}

function getWatchItem(id) {
  const state = ensureState();
  return getWatchItemFromState(state, id);
}

function upsertWatchItem(payload) {
  const state = ensureState();
  const result = upsertWatchItemToState(state, payload);
  saveState(result.state);
  return result.item;
}

function deleteWatchItem(id) {
  const state = ensureState();
  saveState(deleteWatchItemFromState(state, id));
}

function refreshProperties() {
  const state = ensureState();
  const nextState = refreshState(state);
  saveState(nextState);
  return getHomeFeedFromState(nextState);
}

module.exports = {
  deleteWatchItem,
  ensureState,
  getHomeFeed,
  getPropertyDetail,
  getWatchItem,
  getWatchlist,
  refreshProperties,
  upsertWatchItem,
};
