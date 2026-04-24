const STORAGE_KEY = "house_watch_state_v1";
let memoryState = null;

function loadState() {
  if (typeof wx === "undefined") {
    return memoryState;
  }
  try {
    return wx.getStorageSync(STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function saveState(state) {
  if (typeof wx === "undefined") {
    memoryState = state;
    return;
  }
  wx.setStorageSync(STORAGE_KEY, state);
}

module.exports = {
  loadState,
  saveState,
  STORAGE_KEY,
};
