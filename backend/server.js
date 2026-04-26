const http = require("http");
const { URL } = require("url");
const { config } = require("./config");
const {
  ensureWatchCoverage,
  deleteWatchItem,
  getHomeFeed,
  getPropertyDetail,
  getWatchItem,
  getWatchlist,
  migrateLegacyOwnership,
  upsertWatchItem,
} = require("../shared/houseDomain");
const { loadState, saveState } = require("./store");
const { getDistrictOptions, searchCommunities } = require("../data/communityCatalog");
const { refreshStateWithSources, inferSourceType } = require("./refreshSources");
const { startAutoRefresh } = require("./autoRefresh");

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

    if (req.method === "POST" && pathname === "/api/refresh") {
      const nextState = await refreshStateWithSources(loadHydratedState(clientId), clientId);
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
      const refreshedState = await refreshStateWithSources(result.state, clientId);
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
        const refreshedState = await refreshStateWithSources(result.state, clientId);
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
      const property = getPropertyDetail(loadHydratedState(clientId), id, clientId);
      if (!property) {
        notFound(res);
        return;
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
  enabled: config.autoRefreshEnabled,
  hour: config.autoRefreshHour,
  minute: config.autoRefreshMinute,
});
