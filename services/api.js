const { getRuntimeConfig } = require("../config/env");

const DEFAULT_BASE_URL = normalizeBaseUrl(getRuntimeConfig().apiBaseUrl);

function normalizeBaseUrl(url) {
  return (url || "").replace(/\/+$/, "");
}

function getBaseUrl() {
  const app = typeof getApp === "function" ? getApp() : null;
  return normalizeBaseUrl((app && app.globalData && app.globalData.apiBaseUrl) || DEFAULT_BASE_URL);
}

function getClientId() {
  const app = typeof getApp === "function" ? getApp() : null;
  return (app && app.globalData && app.globalData.clientId) || "";
}

function request({ url, method = "GET", data, timeout = 10000 }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${getBaseUrl()}${url}`,
      method,
      data,
      timeout,
      header: {
        "X-House-Watch-Client-Id": getClientId(),
      },
      success: (response) => {
        const { statusCode, data: payload } = response;
        if (statusCode >= 200 && statusCode < 300) {
          resolve(payload);
          return;
        }

        const error = new Error(
          (payload && (payload.message || payload.error)) || `Request failed with ${statusCode}`,
        );
        error.statusCode = statusCode;
        error.payload = payload;
        reject(error);
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
}

function getFeed() {
  return request({
    url: "/api/feed",
  });
}

function getDistricts() {
  return request({
    url: "/api/districts",
  });
}

function refreshFeed() {
  return request({
    url: "/api/refresh",
    method: "POST",
    timeout: 60000,
  });
}

function getProperty(id) {
  return request({
    url: `/api/property/${id}`,
  });
}

function getWatchlist() {
  return request({
    url: "/api/watchlist",
  });
}

function searchCommunities(params = {}) {
  const query = [];
  if (params.district) {
    query.push(`district=${encodeURIComponent(params.district)}`);
  }
  if (params.q) {
    query.push(`q=${encodeURIComponent(params.q)}`);
  }
  if (params.limit) {
    query.push(`limit=${encodeURIComponent(params.limit)}`);
  }

  const suffix = query.length ? `?${query.join("&")}` : "";
  return request({
    url: `/api/communities${suffix}`,
  });
}

function getWatchItem(id) {
  return request({
    url: `/api/watchlist/${id}`,
  });
}

function createWatchItem(data) {
  return request({
    url: "/api/watchlist",
    method: "POST",
    data,
    timeout: 60000,
  });
}

function updateWatchItem(id, data) {
  return request({
    url: `/api/watchlist/${id}`,
    method: "PUT",
    data,
    timeout: 60000,
  });
}

function removeWatchItem(id) {
  return request({
    url: `/api/watchlist/${id}`,
    method: "DELETE",
  });
}

module.exports = {
  createWatchItem,
  getBaseUrl,
  getDistricts,
  getFeed,
  getProperty,
  getWatchItem,
  getWatchlist,
  refreshFeed,
  removeWatchItem,
  request,
  searchCommunities,
  updateWatchItem,
};
