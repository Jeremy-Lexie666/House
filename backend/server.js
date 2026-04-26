const http = require("http");
const { URL } = require("url");
const { config } = require("./config");
const {
  applyWatchSyncResult,
  ensureWatchCoverage,
  deleteWatchItem,
  getHomeFeed,
  getPropertyDetail,
  getWatchItem,
  getWatchlist,
  markClientWatchlistPending,
  migrateLegacyOwnership,
  upsertWatchItem,
} = require("../shared/houseDomain");
const { loadState, saveState } = require("./store");
const { getDistrictOptions, searchCommunities } = require("../data/communityCatalog");
const { refreshStateWithSources, inferSourceType } = require("./refreshSources");
const { startAutoRefresh } = require("./autoRefresh");
const { scrapeBeikePropertyMediaWithBrowser } = require("./sources/beikeBrowser");

function resolveClientId(req) {
  return String(req.headers["x-house-watch-client-id"] || "").trim();
}

function loadHydratedState(clientId = "") {
  const hydrated = ensureWatchCoverage(loadState());
  const migration = migrateLegacyOwnership(hydrated, clientId);
  const nextState = ensureWatchCoverage(migration.state);
  saveState(nextState);
  return nextState;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": config.allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-House-Watch-Client-Id",
  });
  res.end(JSON.stringify(payload));
}

function isInternalAuthorized(req) {
  if (!config.internalSyncToken) {
    return false;
  }
  return String(req.headers["x-internal-sync-token"] || "").trim() === config.internalSyncToken;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function notFound(res) {
  sendJson(res, 404, { error: "Not Found" });
}

function validateWatchPayload(payload) {
  return Boolean(payload.district && payload.communityName && payload.layout);
}

function hasUsableMedia(property) {
  return Boolean(
    property &&
      Array.isArray(property.mediaImages) &&
      property.mediaImages.some((url) => url && !/blank\.gif/i.test(url)),
  );
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = requestUrl;
  const clientId = resolveClientId(req);

  try {
    if (req.method === "GET" && pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        env: config.nodeEnv,
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/feed") {
      sendJson(res, 200, getHomeFeed(loadHydratedState(clientId), clientId));
      return;
    }

    if (pathname === "/api/internal/watchlist") {
      if (!isInternalAuthorized(req)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      if (req.method === "GET") {
        const state = ensureWatchCoverage(loadState());
        saveState(state);
        sendJson(res, 200, {
          lastRefreshedAt: state.lastRefreshedAt || "",
          watchlist: state.watchlist,
        });
        return;
      }

    }

    if (pathname === "/api/internal/sync-results") {
      if (!isInternalAuthorized(req)) {
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      if (req.method === "POST") {
        const body = await readBody(req);
        const nextState = applyWatchSyncResult(ensureWatchCoverage(loadState()), body);
        saveState(nextState);
        sendJson(res, 200, { success: true });
        return;
      }
    }

    if (req.method === "POST" && pathname === "/api/refresh") {
      let nextState;
      if (config.syncMode === "worker") {
        nextState = markClientWatchlistPending(loadHydratedState(clientId), clientId);
      } else {
        nextState = await refreshStateWithSources(loadHydratedState(clientId), clientId);
      }
      saveState(nextState);
      sendJson(res, 200, getHomeFeed(nextState, clientId));
      return;
    }

    if (req.method === "GET" && pathname === "/api/watchlist") {
      sendJson(res, 200, getWatchlist(loadHydratedState(clientId), clientId));
      return;
    }

    if (req.method === "GET" && pathname === "/api/districts") {
      sendJson(res, 200, getDistrictOptions());
      return;
    }

    if (req.method === "GET" && pathname === "/api/communities") {
      const district = requestUrl.searchParams.get("district") || "";
      const query = requestUrl.searchParams.get("q") || "";
      const limit = Number(requestUrl.searchParams.get("limit") || 8);
      sendJson(res, 200, searchCommunities({ district, query, limit }));
      return;
    }

    if (req.method === "POST" && pathname === "/api/watchlist") {
      const body = await readBody(req);
      if (!validateWatchPayload(body)) {
        sendJson(res, 400, { error: "Missing required watch fields." });
        return;
      }
      const baseState = loadHydratedState(clientId);
      const result = upsertWatchItem(baseState, {
        ...body,
        sourceType: body.sourceType || inferSourceType(body.sourceUrl) || "beike",
      }, clientId);
      const refreshedState =
        config.syncMode === "worker"
          ? markClientWatchlistPending(result.state, clientId)
          : await refreshStateWithSources(result.state, clientId);
      saveState(refreshedState);
      const refreshedItem = getWatchItem(refreshedState, result.item.id, clientId) || result.item;
      sendJson(res, 201, refreshedItem);
      return;
    }

    if (pathname.startsWith("/api/watchlist/")) {
      const id = pathname.replace("/api/watchlist/", "");
      if (!id) {
        notFound(res);
        return;
      }

      if (req.method === "GET") {
        const item = getWatchItem(loadHydratedState(clientId), id, clientId);
        if (!item) {
          notFound(res);
          return;
        }
        sendJson(res, 200, item);
        return;
      }

      if (req.method === "PUT") {
        const body = await readBody(req);
        if (!validateWatchPayload(body)) {
          sendJson(res, 400, { error: "Missing required watch fields." });
          return;
        }
        const baseState = loadHydratedState(clientId);
        const result = upsertWatchItem(baseState, {
          ...body,
          sourceType: body.sourceType || inferSourceType(body.sourceUrl) || "beike",
          id,
        }, clientId);
        const refreshedState =
          config.syncMode === "worker"
            ? markClientWatchlistPending(result.state, clientId)
            : await refreshStateWithSources(result.state, clientId);
        saveState(refreshedState);
        const refreshedItem = getWatchItem(refreshedState, result.item.id, clientId) || result.item;
        sendJson(res, 200, refreshedItem);
        return;
      }

      if (req.method === "DELETE") {
        const nextState = deleteWatchItem(loadHydratedState(clientId), id, clientId);
        saveState(nextState);
        sendJson(res, 200, { success: true });
        return;
      }
    }

    if (pathname.startsWith("/api/property/") && req.method === "GET") {
      const id = pathname.replace("/api/property/", "");
      let state = loadHydratedState(clientId);
      let property = getPropertyDetail(state, id, clientId);
      if (!property) {
        notFound(res);
        return;
      }

      if (property.source === "贝壳" && property.detailUrl && !hasUsableMedia(property)) {
        try {
          const media = await scrapeBeikePropertyMediaWithBrowser(property, {
            cdpUrl: config.beikeBrowserCdpUrl,
            cookiesPath: config.beikeCookiesPath,
            userDataDir: config.beikeBrowserSessionDir,
            executablePath: config.beikeChromePath,
            headless: config.beikeBrowserHeadless,
          });

          if (media.imageCount > 0 || media.vrUrl) {
            state = {
              ...state,
              properties: state.properties.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      mediaImages: media.imageCount ? media.mediaImages : item.mediaImages,
                      imageCount: media.imageCount || item.imageCount || 0,
                      hasVR: media.hasVR || item.hasVR,
                      vrUrl: media.vrUrl || item.vrUrl,
                    }
                  : item,
              ),
            };
            saveState(state);
            property = getPropertyDetail(state, id, clientId) || property;
          }
        } catch (error) {
          console.warn(`[property-media] ${id}: ${error.message}`);
        }
      }

      sendJson(res, 200, property);
      return;
    }

    notFound(res);
  } catch (error) {
    if (error.code === "DUPLICATE_WATCH") {
      sendJson(res, 409, {
        error: "Duplicate Watch",
        message: error.message,
      });
      return;
    }
    sendJson(res, 500, {
      error: "Internal Server Error",
      message: error.message,
    });
  }
});

server.listen(config.port, config.host, () => {
  console.log(`House watch API listening on http://${config.host}:${config.port}`);
});

startAutoRefresh({
  enabled: config.autoRefreshEnabled && config.syncMode !== "worker",
  hour: config.autoRefreshHour,
  minute: config.autoRefreshMinute,
});
