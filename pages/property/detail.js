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
      this.setData({
        property: {
          ...property,
          totalLabel: formatCurrencyWan(property.totalPriceWan),
          unitLabel: formatUnitPrice(property.unitPrice),
          areaLabel: formatArea(property.area),
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
        wx.showToast({
          title: "原始链接已复制",
          icon: "none",
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
        wx.showToast({
          title: "VR链接已复制",
          icon: "none",
        });
      },
    });
  },
});
