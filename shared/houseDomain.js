function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, "").trim();
}

function normalizeDistrict(value = "") {
  return normalizeText(value).replace(/区$/, "");
}

function normalizeClientId(value = "") {
  return String(value || "").trim();
}

function watchBelongsToClient(watchItem, clientId = "") {
  const normalizedClientId = normalizeClientId(clientId);
  if (!normalizedClientId) {
    return true;
  }
  return normalizeClientId(watchItem && watchItem.clientId) === normalizedClientId;
}

function propertyBelongsToClient(property, clientId = "") {
  const normalizedClientId = normalizeClientId(clientId);
  if (!normalizedClientId) {
    return true;
  }
  return normalizeClientId(property && property.clientId) === normalizedClientId;
}

function getWatchSignature(watchItem = {}) {
  return [
    normalizeClientId(watchItem.clientId),
    normalizeDistrict(watchItem.district),
    normalizeText(watchItem.communityName),
    normalizeText(watchItem.layout),
  ].join("|");
}

function getPropertySignature(property = {}) {
  return [
    normalizeClientId(property.clientId),
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

  if (
    watchItem.clientId &&
    property.clientId &&
    normalizeClientId(property.clientId) !== normalizeClientId(watchItem.clientId)
  ) {
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

  if (
    watchItem.clientId &&
    property.clientId &&
    normalizeClientId(property.clientId) !== normalizeClientId(watchItem.clientId)
  ) {
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

function migrateLegacyOwnership(state, clientId = "") {
  const normalizedClientId = normalizeClientId(clientId);
  if (!normalizedClientId) {
    return { state, changed: false };
  }

  const hasOwnedWatch = state.watchlist.some((item) => normalizeClientId(item.clientId) === normalizedClientId);
  if (hasOwnedWatch) {
    return { state, changed: false };
  }

  let changed = false;
  const nextState = clone(state);

  nextState.watchlist = nextState.watchlist.map((item) => {
    if (item.clientId) {
      return item;
    }
    changed = true;
    return {
      ...item,
      clientId: normalizedClientId,
    };
  });

  nextState.properties = nextState.properties.map((item) => {
    if (item.clientId) {
      return item;
    }
    changed = true;
    return {
      ...item,
      clientId: normalizedClientId,
    };
  });

  return {
    state: changed ? nextState : state,
    changed,
  };
}

function getMatchedProperties(state, clientId = "") {
  const seen = new Set();
  return state.properties
    .filter((property) => property.watchId && !property.generated && propertyBelongsToClient(property, clientId))
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

function getClientLastRefreshedAt(state, clientId = "") {
  const lastSyncedAtList = state.watchlist
    .filter((item) => watchBelongsToClient(item, clientId) && item.lastSyncedAt)
    .map((item) => item.lastSyncedAt)
    .sort();

  return lastSyncedAtList.length ? lastSyncedAtList[lastSyncedAtList.length - 1] : state.lastRefreshedAt || "";
}

function getHomeFeed(state, clientId = "") {
  return {
    city: "深圳",
    lastRefreshedAt: getClientLastRefreshedAt(state, clientId),
    watchlist: [...state.watchlist]
      .filter((item) => watchBelongsToClient(item, clientId))
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    properties: getMatchedProperties(state, clientId),
  };
}

function getPropertyDetail(state, id, clientId = "") {
  const property = state.properties.find((item) => item.id === id && propertyBelongsToClient(item, clientId));
  if (!property) {
    return null;
  }

  const related = state.properties
    .filter(
      (item) =>
        item.id !== id &&
        propertyBelongsToClient(item, clientId) &&
        item.communityName === property.communityName &&
        item.layout === property.layout,
    )
    .sort((a, b) => a.totalPriceWan - b.totalPriceWan)
    .slice(0, 2);
  const watchItem =
    state.watchlist.find((item) => watchBelongsToClient(item, clientId) && propertyBelongsToWatch(property, item)) || null;

  return {
    ...property,
    watchItem,
    related,
  };
}

function getWatchlist(state, clientId = "") {
  return [...state.watchlist]
    .filter((item) => watchBelongsToClient(item, clientId))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getWatchItem(state, id, clientId = "") {
  return state.watchlist.find((item) => item.id === id && watchBelongsToClient(item, clientId)) || null;
}

function findDuplicateWatch(state, payload, clientId = "") {
  const targetSignature = getWatchSignature(payload);
  return (
    state.watchlist.find(
      (item) =>
        watchBelongsToClient(item, clientId) &&
        item.id !== payload.id &&
        getWatchSignature(item) === targetSignature,
    ) || null
  );
}

function upsertWatchItem(state, payload, clientId = "") {
  const now = formatNow();
  const nextItem = {
    id: payload.id || `watch-${Date.now()}`,
    clientId: normalizeClientId(clientId),
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
  const duplicate = findDuplicateWatch(nextState, nextItem, clientId);
  if (duplicate) {
    const error = new Error("已存在相同的关注条件");
    error.code = "DUPLICATE_WATCH";
    throw error;
  }

  const index = nextState.watchlist.findIndex(
    (item) => item.id === nextItem.id && watchBelongsToClient(item, clientId),
  );
  if (index >= 0) {
    nextState.watchlist.splice(index, 1, nextItem);
  } else {
    nextState.watchlist.unshift(nextItem);
  }

  nextState.properties = nextState.properties.filter(
    (property) => !propertyBelongsToClient(property, clientId) || !isLooseMatchedProperty(property, nextItem),
  );

  const hydratedState = ensureWatchCoverage(nextState);

  return {
    state: hydratedState,
    item: nextItem,
  };
}

function deleteWatchItem(state, id, clientId = "") {
  const nextState = clone(state);
  nextState.watchlist = nextState.watchlist.filter(
    (item) => !(item.id === id && watchBelongsToClient(item, clientId)),
  );
  nextState.properties = nextState.properties.filter(
    (item) =>
      !(
        propertyBelongsToClient(item, clientId) &&
        (item.generatedWatchId === id || item.watchId === id)
      ),
  );
  return nextState;
}

function applyWatchSyncResult(state, payload) {
  const nextState = clone(state);
  const now = payload.syncedAt || formatNow();
  const normalizedClientId = normalizeClientId(payload.clientId);
  const shouldReplaceProperties = payload.syncStatus !== "error";
  const targetWatch = nextState.watchlist.find(
    (item) => item.id === payload.watchId && normalizeClientId(item.clientId) === normalizedClientId,
  );

  if (!targetWatch) {
    const error = new Error("未找到需要写回结果的关注项");
    error.code = "WATCH_NOT_FOUND";
    throw error;
  }

  if (shouldReplaceProperties) {
    nextState.properties = nextState.properties.filter(
      (item) =>
        !(
          normalizeClientId(item.clientId) === normalizedClientId &&
          (item.watchId === payload.watchId || item.generatedWatchId === payload.watchId)
        ),
    );

    if (Array.isArray(payload.properties) && payload.properties.length) {
      nextState.properties.push(
        ...payload.properties.map((item) => ({
          ...item,
          watchId: payload.watchId,
          clientId: normalizedClientId,
          generated: false,
          updatedAt: item.updatedAt || now,
        })),
      );
    }
  }

  nextState.watchlist = nextState.watchlist.map((item) => {
    if (!(item.id === payload.watchId && normalizeClientId(item.clientId) === normalizedClientId)) {
      return item;
    }

    return {
      ...item,
      sourceType: payload.sourceType || item.sourceType || "beike",
      sourceUrl: payload.sourceUrl || item.sourceUrl || "",
      syncStatus: payload.syncStatus || "success",
      syncError: payload.syncError || "",
      lastSyncedAt: now,
      communityName: payload.communityName || item.communityName,
      district: payload.district || item.district,
      updatedAt: now,
    };
  });

  nextState.lastRefreshedAt = now;
  return ensureWatchCoverage(nextState);
}

function markClientWatchlistPending(state, clientId = "") {
  const nextState = clone(state);
  const now = formatNow();

  nextState.watchlist = nextState.watchlist.map((item) => {
    if (!watchBelongsToClient(item, clientId)) {
      return item;
    }

    return {
      ...item,
      syncStatus: "pending",
      syncError: "",
      updatedAt: now,
    };
  });

  nextState.lastRefreshedAt = now;
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
  applyWatchSyncResult,
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
  migrateLegacyOwnership,
  markClientWatchlistPending,
  propertyBelongsToClient,
  refreshState,
  upsertWatchItem,
  watchBelongsToClient,
};
