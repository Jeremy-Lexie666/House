const { getBaseUrl, getFeed, refreshFeed } = require("../../services/api");
const {
  formatArea,
  formatCurrencyWan,
  formatUnitPrice,
  getRelativeLabel,
} = require("../../utils/format");

function mapProperty(property) {
  const isSample = Boolean(property.generated);

  return {
    ...property,
    displayTitle: property.communityName,
    totalLabel: formatCurrencyWan(property.totalPriceWan),
    unitLabel: formatUnitPrice(property.unitPrice),
    areaLabel: formatArea(property.area),
    updateLabel: getRelativeLabel(property.updatedAt),
    metaLine: `${property.layout} · ${formatArea(property.area)} · ${property.floor} · ${property.orientation}`,
    subtitle: property.district,
    dataLabel: isSample ? "示例数据" : "真实抓取",
    dataClassName: isSample ? "property-data-badge-sample" : "property-data-badge-real",
  };
}

Page({
  data: {
    city: "深圳",
    lastRefreshedAt: "",
    refreshLabel: "",
    watchCount: 0,
    propertyCount: 0,
    properties: [],
    refreshing: false,
    loading: true,
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const feed = await getFeed();
      this.setData({
        city: feed.city,
        lastRefreshedAt: feed.lastRefreshedAt,
        refreshLabel: getRelativeLabel(feed.lastRefreshedAt),
        watchCount: feed.watchlist.length,
        propertyCount: feed.properties.length,
        properties: feed.properties.map(mapProperty),
      });
    } catch (error) {
      wx.showToast({
        title: "无法连接服务",
        icon: "none",
      });
      console.warn("Feed request failed.", getBaseUrl(), error);
    } finally {
      this.setData({ loading: false });
    }
  },

  async handleRefresh() {
    if (this.data.refreshing) {
      return;
    }

    this.setData({ refreshing: true });
    wx.showLoading({
      title: "房源抓取中，请耐心等待",
      mask: true,
    });

    try {
      const feed = await refreshFeed();
      this.setData({
        city: feed.city,
        lastRefreshedAt: feed.lastRefreshedAt,
        refreshLabel: getRelativeLabel(feed.lastRefreshedAt),
        watchCount: feed.watchlist.length,
        propertyCount: feed.properties.length,
        properties: feed.properties.map(mapProperty),
      });
      wx.showToast({
        title: "已刷新最新房源",
        icon: "success",
      });
    } catch (error) {
      wx.showToast({
        title: "刷新失败",
        icon: "none",
      });
      console.warn("Refresh request failed.", getBaseUrl(), error);
    } finally {
      wx.hideLoading();
      this.setData({ refreshing: false });
    }
  },

  openManage() {
    wx.navigateTo({
      url: "/pages/manage/manage",
    });
  },

  openAdd() {
    wx.navigateTo({
      url: "/pages/add/add",
    });
  },

  handleEmptyAction() {
    if (this.data.watchCount > 0) {
      this.openManage();
      return;
    }
    this.openAdd();
  },

  openProperty(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/property/detail?id=${id}`,
    });
  },
});
