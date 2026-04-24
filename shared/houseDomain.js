function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function parseRoomCount(layout = "") {
  const match = String(layout).match(/(\d+)/);
  return match ? Number(match[1]) : 3;
}

function getDistrictUnitPrice(district = "") {
  const map = {
    南山: 82000,
    福田: 98000,
    宝安: 68000,
    龙华区: 62000,
    龙岗: 46000,
    罗湖: 72000,
    盐田: 54000,
    光明区: 43000,
    坪山区: 36000,
    大鹏新区: 35000,
    深汕合作区: 18000,
  };
  return map[district] || 58000;
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

  return (
    property.communityName === watchItem.communityName &&
    property.district === watchItem.district &&
    property.layout === watchItem.layout &&
    property.bathrooms === watchItem.bathrooms
  );
}

function matchesWatchItem(property, watchItem) {
  return propertyBelongsToWatch(property, watchItem);
}

function buildGeneratedProperties(watchItem, now) {
  const roomCount = parseRoomCount(watchItem.layout);
  const districtUnitPrice = getDistrictUnitPrice(watchItem.district);
  const areaBase = roomCount * 28 + 6;
  const variants = [
    {
      suffix: "南向舒展户型",
      area: areaBase + 1.8,
      floor: "中楼层",
      orientation: "南",
      source: "贝壳",
      premium: -2500,
      tags: ["低价", "有图"],
      reductionWan: 6,
      imageCount: 9,
      hasVR: false,
      mediaLabels: ["客厅", "卧室", "阳台"],
    },
    {
      suffix: "两厅通透格局",
      area: areaBase + 4.6,
      floor: "高楼层",
      orientation: "东南",
      source: "乐有家",
      premium: 1800,
      tags: ["新上"],
      reductionWan: 0,
      imageCount: 7,
      hasVR: false,
      mediaLabels: ["客厅", "主卧", "餐厅"],
    },
  ];

  return variants.map((variant, index) => {
    const unitPrice = districtUnitPrice + variant.premium;
    const totalPriceWan = Math.round((unitPrice * variant.area) / 10000);
    const id = `generated-${watchItem.id}-${index + 1}`;
    const detailUrl =
      variant.source === "贝壳" ? "https://sz.ke.com/ershoufang/" : "https://shenzhen.leyoujia.com/";

    return {
      id,
      watchId: watchItem.id,
      generatedWatchId: watchItem.id,
      generated: true,
      communityName: watchItem.communityName,
      district: watchItem.district,
      layout: watchItem.layout,
      bathrooms: watchItem.bathrooms,
      title: `${watchItem.communityName} ${watchItem.layout}${watchItem.bathrooms} ${variant.suffix}`,
      totalPriceWan,
      unitPrice,
      area: Number(variant.area.toFixed(2)),
      floor: variant.floor,
      orientation: variant.orientation,
      source: variant.source,
      updatedAt: now,
      listingCode: `LOCAL-${watchItem.id}-${index + 1}`,
      tags: variant.tags,
      reductionWan: variant.reductionWan,
      imageCount: variant.imageCount,
      hasVR: variant.hasVR,
      mediaLabels: variant.mediaLabels,
      description: `当前是为 ${watchItem.communityName} 生成的本地示例房源。后续接入真实抓取后，这里会替换成实时平台数据。`,
      detailUrl,
      vrUrl: variant.hasVR ? detailUrl : "",
    };
  });
}

function ensureWatchCoverage(state) {
  const nextState = clone(state);
  const watchlistById = new Map(nextState.watchlist.map((item) => [item.id, item]));

  nextState.properties = nextState.properties.filter((property) => {
    if (!property.generatedWatchId && !property.watchId) {
      return true;
    }
    const watchItem = watchlistById.get(property.watchId || property.generatedWatchId);
    return Boolean(watchItem && propertyBelongsToWatch(property, watchItem));
  });

  nextState.watchlist.forEach((watchItem) => {
    const hasMatch = nextState.properties.some((property) => propertyBelongsToWatch(property, watchItem));
    if (!hasMatch) {
      nextState.properties.push(...buildGeneratedProperties(watchItem, nextState.lastRefreshedAt || formatNow()));
    }
  });

  return nextState;
}

function getMatchedProperties(state) {
  return state.properties
    .filter((property) => state.watchlist.some((watchItem) => propertyBelongsToWatch(property, watchItem)))
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

function upsertWatchItem(state, payload) {
  const now = formatNow();
  const nextItem = {
    id: payload.id || `watch-${Date.now()}`,
    city: "深圳",
    district: payload.district,
    communityName: payload.communityName,
    layout: payload.layout,
    bathrooms: payload.bathrooms,
    sourceType: payload.sourceType || "",
    sourceUrl: payload.sourceUrl || "",
    lastSyncedAt: payload.lastSyncedAt || "",
    syncStatus: payload.syncStatus || "",
    syncError: payload.syncError || "",
    createdAt: payload.createdAt || now,
    updatedAt: now,
  };

  const nextState = clone(state);
  const index = nextState.watchlist.findIndex((item) => item.id === nextItem.id);
  if (index >= 0) {
    nextState.watchlist.splice(index, 1, nextItem);
  } else {
    nextState.watchlist.unshift(nextItem);
  }

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
  const scenarios = [
    {
      propertyId: "property-2",
      nextTotalPriceWan: 715,
      nextReductionWan: 13,
      nextTags: ["降价", "低价", "有图"],
    },
    {
      propertyId: "property-1",
      nextTotalPriceWan: 688,
      nextReductionWan: 28,
      nextTags: ["降价", "VR", "低价"],
    },
    {
      propertyId: "property-5",
      nextTotalPriceWan: 1248,
      nextReductionWan: 37,
      nextTags: ["VR", "降价"],
    },
  ];

  const scenario = scenarios[nextState.refreshCount % scenarios.length];
  const target = nextState.properties.find((item) => item.id === scenario.propertyId);
  if (target) {
    target.totalPriceWan = scenario.nextTotalPriceWan;
    target.reductionWan = scenario.nextReductionWan;
    target.tags = scenario.nextTags;
    target.updatedAt = now;
    target.unitPrice = Math.round((target.totalPriceWan * 10000) / target.area);
  }

  nextState.properties
    .filter((item) => item.generatedWatchId)
    .forEach((item, index) => {
      const adjustment = (nextState.refreshCount + index) % 2 === 0 ? -1 : 1;
      item.totalPriceWan = Math.max(item.totalPriceWan + adjustment, 1);
      item.unitPrice = Math.round((item.totalPriceWan * 10000) / item.area);
      item.updatedAt = now;
    });

  nextState.lastRefreshedAt = now;
  nextState.refreshCount += 1;
  nextState.watchlist = nextState.watchlist.map((item) => ({
    ...item,
    updatedAt: now,
  }));

  return nextState;
}

module.exports = {
  buildGeneratedProperties,
  deleteWatchItem,
  ensureWatchCoverage,
  formatNow,
  getHomeFeed,
  getMatchedProperties,
  getPropertyDetail,
  getWatchItem,
  getWatchlist,
  matchesWatchItem,
  refreshState,
  upsertWatchItem,
};
