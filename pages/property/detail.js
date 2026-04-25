const { getProperty } = require("../../services/api");
const { formatArea, formatCurrencyWan, formatUnitPrice } = require("../../utils/format");

Page({
  data: {
    property: null,
  },

  onLoad(options) {
    this.propertyId = options.id;
  },

  async onShow() {
    try {
      const property = await getProperty(this.propertyId);
      const isSample = Boolean(property.generated);
      this.setData({
        property: {
          ...property,
          displayTitle: property.communityName,
          totalLabel: formatCurrencyWan(property.totalPriceWan),
          unitLabel: formatUnitPrice(property.unitPrice),
          areaLabel: formatArea(property.area),
          dataLabel: isSample ? "示例数据" : "真实抓取",
          dataClassName: isSample ? "detail-data-badge-sample" : "detail-data-badge-real",
          related: property.related.map((item) => ({
            ...item,
            totalLabel: formatCurrencyWan(item.totalPriceWan),
          })),
        },
      });
    } catch (error) {
      wx.showToast({
        title: "房源加载失败",
        icon: "none",
      });
    }
  },

  copyLink() {
    const { property } = this.data;
    wx.setClipboardData({
      data: property.detailUrl,
      success: () => {
        wx.showModal({
          title: "链接已复制",
          content: "微信小程序里暂不直接打开贝壳网页，已经帮你复制到剪贴板，可以粘贴到浏览器查看。",
          showCancel: false,
          confirmText: "知道了",
        });
      },
    });
  },

  copyVRLink() {
    const { property } = this.data;
    if (!property || !property.vrUrl) {
      wx.showToast({
        title: "暂无VR链接",
        icon: "none",
      });
      return;
    }

    wx.setClipboardData({
      data: property.vrUrl,
      success: () => {
        wx.showModal({
          title: "VR链接已复制",
          content: "已经帮你复制 VR 链接，可以粘贴到浏览器继续查看。",
          showCancel: false,
          confirmText: "知道了",
        });
      },
    });
  },
});
