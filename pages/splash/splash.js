Page({
  data: {
    progressStyle: "",
  },

  onLoad() {
    this.progressTimer = setTimeout(() => {
      this.setData({
        progressStyle: "width: 100%;",
      });
    }, 80);

    this.redirectTimer = setTimeout(() => {
      wx.reLaunch({
        url: "/pages/index/index",
      });
    }, 2400);
  },

  onUnload() {
    if (this.progressTimer) {
      clearTimeout(this.progressTimer);
    }
    if (this.redirectTimer) {
      clearTimeout(this.redirectTimer);
    }
  },
});
