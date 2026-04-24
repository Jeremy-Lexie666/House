const { getFeed, refreshFeed } = require("../../services/api");
const {
  formatArea,
  formatCurrencyWan,
  formatUnitPrice,
  getRelativeLabel,
} = require("../../utils/format");

function mapProperty(property) {
  return {
    ...property,
    totalLabel: formatCurrencyWan(property.totalPriceWan),
    unitLabel: formatUnitPrice(property.unitPrice),
    areaLabel: formatArea(property.area),
    updateLabel: getRelativeLabel(property.updatedAt),
    metaLine: `${property.layout}${property.bathrooms} · ${formatArea(property.area)} · ${property.floor} · ${property.orientation}`,
    subtitle: `${property.communityName} · ${property.district}`,
  };
}

Page({
  data: {
    city: "深圳",
    lastRefreshedAt: "",
    refreshLabel: "",
    propertyCount: 0,
    properties: [],
    refreshing: false,
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const feed = await getFeed();
      this.setData({
        city: feed.city,
        lastRefreshedAt: feed.lastRefreshedAt,
        refreshLabel: getRelativeLabel(feed.lastRefreshedAt),
        propertyCount: feed.properties.length,
        properties: feed.properties.map(mapProperty),
      });
    } catch (error) {
      wx.showToast({
        title: "请先启动本地API",
        icon: "none",
      });
    }
  },

  async handleRefresh() {
    this.setData({ refreshing: true });
    wx.showLoading({
      title: "刷新中",
      mask: true,
    });

    try {
      const feed = await refreshFeed();
      this.setData({
        city: feed.city,
        lastRefreshedAt: feed.lastRefreshedAt,
        refreshLabel: getRelativeLabel(feed.lastRefreshedAt),
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

  openProperty(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/property/detail?id=${id}`,
    });
  },
});
