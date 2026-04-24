const { formatNow, refreshState } = require("../shared/houseDomain");
const { scrapeBeikeWatch } = require("./sources/beike");

function inferSourceType(sourceUrl = "") {
  if (/ke\.com/.test(sourceUrl)) {
    return "beike";
  }
  return "";
}

function clearWatchProperties(state, watchId) {
  state.properties = state.properties.filter(
    (item) => item.watchId !== watchId && item.generatedWatchId !== watchId,
  );
}

function updateWatchSyncMeta(state, watchId, patch) {
  state.watchlist = state.watchlist.map((item) => {
    if (item.id !== watchId) {
      return item;
    }
    return {
      ...item,
      ...patch,
    };
  });
}

async function refreshStateWithSources(state) {
  const nextState = refreshState(state);
  const now = formatNow();

  for (const watchItem of nextState.watchlist) {
    const sourceType = watchItem.sourceType || inferSourceType(watchItem.sourceUrl);
    if (!watchItem.sourceUrl || sourceType !== "beike") {
      continue;
    }

    try {
      const result = await scrapeBeikeWatch(
        {
          ...watchItem,
          sourceType,
        },
        now,
      );

      clearWatchProperties(nextState, watchItem.id);

      if (result.properties.length) {
        nextState.properties.push(...result.properties);
      }

      updateWatchSyncMeta(nextState, watchItem.id, {
        sourceType,
        sourceUrl: watchItem.sourceUrl,
        syncStatus: result.properties.length ? "success" : "empty",
        syncError: result.properties.length
          ? ""
          : `贝壳页面当前没有抓到符合 ${watchItem.layout} 的房源`,
        lastSyncedAt: now,
        communityName: result.meta.communityName || watchItem.communityName,
        district: result.meta.district || watchItem.district,
        updatedAt: now,
      });
    } catch (error) {
      updateWatchSyncMeta(nextState, watchItem.id, {
        sourceType,
        sourceUrl: watchItem.sourceUrl,
        syncStatus: "error",
        syncError: error.message,
        lastSyncedAt: now,
        updatedAt: now,
      });
    }
  }

  nextState.lastRefreshedAt = now;
  return nextState;
}

module.exports = {
  inferSourceType,
  refreshStateWithSources,
};
