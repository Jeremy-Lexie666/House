const { getWatchlist, removeWatchItem } = require("../../services/api");

Page({
  data: {
    watchlist: [],
    deletingId: "",
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    try {
      const watchlist = (await getWatchlist()).map((item) => ({
        ...item,
        summary: `${item.city} · ${item.district} · ${item.layout}`,
        syncLabel:
          item.syncStatus === "success"
            ? "已抓到真实房源"
            : item.syncStatus === "empty"
              ? "暂未抓到真实房源"
              : item.syncStatus === "error"
                ? "贝壳抓取失败"
                : "等待抓取",
        syncBadgeClass:
          item.syncStatus === "success"
            ? "watch-badge-success"
            : item.syncStatus === "empty"
              ? "watch-badge-warn"
              : item.syncStatus === "error"
                ? "watch-badge-error"
                : "watch-badge-pending",
        syncHint:
          item.syncStatus === "success"
            ? `上次抓取 ${item.lastSyncedAt || item.updatedAt}`
            : item.syncStatus === "empty"
              ? item.syncError || "暂未抓到符合条件的真实房源"
              : item.syncStatus === "error"
                ? item.syncError || "真实抓取失败"
                : "等待自动抓取最新房源",
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
    if (this.data.deletingId) {
      return;
    }

    wx.showModal({
      title: "删除关注",
      content: "删除后首页将不再展示这条条件下的房源。",
      success: ({ confirm }) => {
        if (!confirm) {
          return;
        }
        this.setData({ deletingId: id });
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
          })
          .finally(() => {
            this.setData({ deletingId: "" });
          });
      },
    });
  },
});
