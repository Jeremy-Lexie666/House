const { getWatchlist, removeWatchItem } = require("../../services/api");

Page({
  data: {
    watchlist: [],
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const watchlist = (await getWatchlist()).map((item) => ({
        ...item,
        summary: `${item.city} · ${item.district} · ${item.layout}${item.bathrooms}`,
        sourceLabel: item.sourceType === "beike" ? "贝壳真实抓取" : "本地示例",
        syncHint:
          item.syncStatus === "success"
            ? `上次抓取 ${item.lastSyncedAt || item.updatedAt}`
            : item.syncStatus === "empty"
              ? item.syncError || "暂未抓到符合条件的真实房源"
              : item.syncStatus === "error"
                ? item.syncError || "真实抓取失败"
                : item.sourceUrl
                  ? "等待刷新抓取真实房源"
                  : "未配置真实抓取链接",
      }));

      this.setData({ watchlist });
    } catch (error) {
      wx.showToast({
        title: "关注列表加载失败",
        icon: "none",
      });
    }
  },

  openAdd() {
    wx.navigateTo({
      url: "/pages/add/add",
    });
  },

  openEdit(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/add/add?id=${id}`,
    });
  },

  handleDelete(event) {
    const { id } = event.currentTarget.dataset;
    wx.showModal({
      title: "删除关注",
      content: "删除后首页将不再展示这条条件下的房源。",
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }
        removeWatchItem(id)
          .then(() => {
            this.loadData();
            wx.showToast({
              title: "已删除",
              icon: "success",
            });
          })
          .catch(() => {
            wx.showToast({
              title: "删除失败",
              icon: "none",
            });
          });
      },
    });
  },
});
