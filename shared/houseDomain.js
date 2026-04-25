function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, "").trim();
}

function normalizeDistrict(value = "") {
  return normalizeText(value).replace(/区$/, "");
}

function getWatchSignature(watchItem = {}) {
  return [
    normalizeDistrict(watchItem.district),
    normalizeText(watchItem.communityName),
    normalizeText(watchItem.layout),
  ].join("|");
}

function getPropertySignature(property = {}) {
  return [
    property.watchId || "",
    property.listingCode || property.detailUrl || property.id || "",
    normalizeText(property.communityName),
    normalizeText(property.layout),
    Number(property.area || 0),
    Number(property.totalPriceWan || 0),
  ].join("|");
}

function formatNow() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  const hour = `${now.getHours()}`.padStart(2, "0");
  const minute = `${now.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function propertyBelongsToWatch(property, watchItem) {
  if (!property || !watchItem) {
    return false;
  }

  if (property.watchId && property.watchId === watchItem.id) {
    return true;
  }

  if (property.generatedWatchId && property.generatedWatchId === watchItem.id) {
    return true;
  }

  const watchBathrooms = normalizeText(watchItem.bathrooms);
  return (
    normalizeText(property.communityName) === normalizeText(watchItem.communityName) &&
    normalizeDistrict(property.district) === normalizeDistrict(watchItem.district) &&
    normalizeText(property.layout) === normalizeText(watchItem.layout) &&
    (!watchBathrooms || normalizeText(property.bathrooms) === watchBathrooms)
  );
}

function matchesWatchItem(property, watchItem) {
  return propertyBelongsToWatch(property, watchItem);
}

function isLooseMatchedProperty(property, watchItem) {
  if (!property || !watchItem) {
    return false;
  }

  if (property.watchId || property.generatedWatchId) {
    return false;
  }

  const watchBathrooms = normalizeText(watchItem.bathrooms);
  return (
    normalizeText(property.communityName) === normalizeText(watchItem.communityName) &&
    normalizeDistrict(property.district) === normalizeDistrict(watchItem.district) &&
    normalizeText(property.layout) === normalizeText(watchItem.layout) &&
    (!watchBathrooms || normalizeText(property.bathrooms) === watchBathrooms)
  );
}

function dedupeState(state) {
  const nextState = clone(state);
  const sortedWatchlist = [...nextState.watchlist].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0),
  );
  const seenWatchSignatures = new Map();
  const watchIdAliases = new Map();

  nextState.watchlist = sortedWatchlist.filter((watchItem) => {
    const signature = getWatchSignature(watchItem);
    const kept = seenWatchSignatures.get(signature);
    if (!kept) {
      seenWatchSignatures.set(signature, watchItem.id);
      watchIdAliases.set(watchItem.id, watchItem.id);
      return true;
    }
    watchIdAliases.set(watchItem.id, kept);
    return false;
  });

  const seenPropertySignatures = new Set();
  nextState.properties = nextState.properties
    .map((property) => {
      const nextWatchId = property.watchId ? watchIdAliases.get(property.watchId) || property.watchId : property.watchId;
      return {
        ...property,
        watchId: nextWatchId,
      };
    })
    .filter((property) => {
      const signature = getPropertySignature(property);
      if (seenPropertySignatures.has(signature)) {
        return false;
      }
      seenPropertySignatures.add(signature);
      return true;
    });

  return nextState;
}

function ensureWatchCoverage(state) {
  const nextState = dedupeState(state);
  const watchlistById = new Map(nextState.watchlist.map((item) => [item.id, item]));

  nextState.properties = nextState.properties.filter((property) => {
    if (property.generated || !property.watchId) {
      return false;
    }
    const watchItem = watchlistById.get(property.watchId);
    return Boolean(watchItem && propertyBelongsToWatch(property, watchItem));
  });

  return nextState;
}

function getMatchedProperties(state) {
  const seen = new Set();
  return state.properties
    .filter((property) => property.watchId && !property.generated)
    .filter((property) => {
      const signature = [
        property.listingCode || property.detailUrl || property.id,
        normalizeText(property.communityName),
      ].join("|");
      if (seen.has(signature)) {
        return false;
      }
      seen.add(signature);
      return true;
    })
    .sort((a, b) => a.totalPriceWan - b.totalPriceWan);
}

function getHomeFeed(state) {
  return {
    city: "深圳",
    lastRefreshedAt: state.lastRefreshedAt,
    watchlist: [...state.watchlist].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    properties: getMatchedProperties(state),
  };
}

function getPropertyDetail(state, id) {
  const property = state.properties.find((item) => item.id === id);
  if (!property) {
    return null;
  }

  const related = state.properties
    .filter((item) => item.id !== id && item.communityName === property.communityName && item.layout === property.layout)
    .sort((a, b) => a.totalPriceWan - b.totalPriceWan)
    .slice(0, 2);
  const watchItem = state.watchlist.find((item) => propertyBelongsToWatch(property, item)) || null;

  return {
    ...property,
    watchItem,
    related,
  };
}

function getWatchlist(state) {
  return [...state.watchlist].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getWatchItem(state, id) {
  return state.watchlist.find((item) => item.id === id) || null;
}

function findDuplicateWatch(state, payload) {
  const targetSignature = getWatchSignature(payload);
  return state.watchlist.find((item) => item.id !== payload.id && getWatchSignature(item) === targetSignature) || null;
}

function upsertWatchItem(state, payload) {
  const now = formatNow();
  const nextItem = {
    id: payload.id || `watch-${Date.now()}`,
    city: "深圳",
    district: payload.district,
    communityName: payload.communityName,
    layout: payload.layout,
    bathrooms: payload.bathrooms || "",
    sourceType: payload.sourceType || "beike",
    sourceUrl: payload.sourceUrl || "",
    lastSyncedAt: payload.lastSyncedAt || "",
    syncStatus: payload.syncStatus || "",
    syncError: payload.syncError || "",
    createdAt: payload.createdAt || now,
    updatedAt: now,
  };

  const nextState = dedupeState(state);
  const duplicate = findDuplicateWatch(nextState, nextItem);
  if (duplicate) {
    const error = new Error("已存在相同的关注条件");
    error.code = "DUPLICATE_WATCH";
    throw error;
  }

  const index = nextState.watchlist.findIndex((item) => item.id === nextItem.id);
  if (index >= 0) {
    nextState.watchlist.splice(index, 1, nextItem);
  } else {
    nextState.watchlist.unshift(nextItem);
  }

  nextState.properties = nextState.properties.filter((property) => !isLooseMatchedProperty(property, nextItem));

  const hydratedState = ensureWatchCoverage(nextState);

  return {
    state: hydratedState,
    item: nextItem,
  };
}

function deleteWatchItem(state, id) {
  const nextState = clone(state);
  nextState.watchlist = nextState.watchlist.filter((item) => item.id !== id);
  nextState.properties = nextState.properties.filter(
    (item) => item.generatedWatchId !== id && item.watchId !== id,
  );
  return nextState;
}

function refreshState(state) {
  const nextState = ensureWatchCoverage(state);
  const now = formatNow();
  nextState.lastRefreshedAt = now;
  nextState.refreshCount += 1;

  return nextState;
}

module.exports = {
  deleteWatchItem,
  dedupeState,
  ensureWatchCoverage,
  findDuplicateWatch,
  formatNow,
  getHomeFeed,
  getMatchedProperties,
  getPropertyDetail,
  getWatchItem,
  getWatchlist,
  isLooseMatchedProperty,
  matchesWatchItem,
  refreshState,
  upsertWatchItem,
};
