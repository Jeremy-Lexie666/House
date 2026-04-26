const { config } = require("./config");
const { formatNow, refreshState } = require("../shared/houseDomain");
const { resolveBeikeCommunityUrl, scrapeBeikeWatch } = require("./sources/beike");
const { scrapeBeikeWatchWithBrowser } = require("./sources/beikeBrowser");

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
    const sourceType = watchItem.sourceType || inferSourceType(watchItem.sourceUrl) || "beike";
    if (sourceType !== "beike") {
      continue;
    }

    try {
      const sourceUrl = watchItem.sourceUrl || (await resolveBeikeCommunityUrl(watchItem));
      const baseWatchItem = {
        ...watchItem,
        sourceType,
        sourceUrl,
      };
      let result;

      if (config.beikeBrowserEnabled) {
        result = await scrapeBeikeWatchWithBrowser(baseWatchItem, now, {
          headless: config.beikeBrowserHeadless,
          cdpUrl: config.beikeBrowserCdpUrl,
          userDataDir: config.beikeBrowserSessionDir,
          cookiesPath: config.beikeCookiesPath,
          executablePath: config.beikeChromePath,
          allowInteractiveCaptcha: false,
        });
      } else {
        result = await scrapeBeikeWatch(baseWatchItem, now);
      }

      clearWatchProperties(nextState, watchItem.id);

      if (result.properties.length) {
        nextState.properties.push(...result.properties);
      }

      updateWatchSyncMeta(nextState, watchItem.id, {
        sourceType,
        sourceUrl,
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
        sourceUrl: watchItem.sourceUrl || "",
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
