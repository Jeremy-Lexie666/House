const {
  createWatchItem,
  getBaseUrl,
  getDistricts,
  getWatchItem,
  searchCommunities,
  updateWatchItem,
} = require("../../services/api");

const layoutOptions = ["1房", "2房", "3房", "4房", "5房+"];
const fallbackDistrictOptions = ["南山", "福田", "宝安", "龙华区", "龙岗", "罗湖"];

Page({
  data: {
    id: "",
    district: "",
    communityName: "",
    layoutIndex: -1,
    layoutOptions,
    districtOptions: fallbackDistrictOptions,
    districtIndex: -1,
    isEdit: false,
    communitySuggestions: [],
    showCommunitySuggestions: false,
    communityLoading: false,
    submitting: false,
    formReady: false,
  },

  async onLoad(options) {
    await this.loadDistrictOptions();

    if (options.id) {
      try {
        const item = await getWatchItem(options.id);
        const districtOptions = this.data.districtOptions;
        if (item) {
          this.setData({
            id: item.id,
            district: item.district,
            communityName: item.communityName,
            layoutIndex: layoutOptions.indexOf(item.layout),
            districtIndex: districtOptions.indexOf(item.district),
            isEdit: true,
          });
          this.syncFormReady();
        }
      } catch (error) {
        wx.showToast({
          title: "关注条件加载失败",
          icon: "none",
        });
      }
    }
  },

  async loadDistrictOptions() {
    try {
      const districtOptions = await getDistricts();
      if (districtOptions && districtOptions.length) {
        this.setData({ districtOptions });
        this.syncFormReady();
      }
    } catch (error) {
      this.setData({ districtOptions: fallbackDistrictOptions });
      this.syncFormReady();
    }
  },

  syncFormReady() {
    const { district, communityName, layoutIndex, bathroomIndex } = this.data;
    const formReady = Boolean(
      district &&
        String(communityName || "").trim() &&
        layoutIndex >= 0,
    );
    if (formReady !== this.data.formReady) {
      this.setData({ formReady });
    }
  },

  handleInput(event) {
    const { field } = event.currentTarget.dataset;
    const value = event.detail.value;
    this.setData({
      [field]: value,
    });
    this.syncFormReady();

    if (field === "communityName") {
      const keyword = String(value || "").trim();
      if (!keyword) {
        this.setData({
          communitySuggestions: [],
          showCommunitySuggestions: false,
          communityLoading: false,
        });
        return;
      }
      this.loadCommunitySuggestions(keyword);
    }
  },

  handleLayoutChange(event) {
    this.setData({
      layoutIndex: Number(event.currentTarget.dataset.index),
    });
    this.syncFormReady();
  },

  handleDistrictChange(event) {
    const index = Number(event.detail.value);
    const { districtOptions } = this.data;
    this.setData({
      districtIndex: index,
      district: districtOptions[index],
    });
    this.syncFormReady();
  },

  async loadCommunitySuggestions(keyword = "") {
    const { district } = this.data;
    const query = String(keyword || "").trim();

    if (!query) {
      this.setData({
        communitySuggestions: [],
        showCommunitySuggestions: false,
        communityLoading: false,
      });
      return;
    }

    this.setData({
      communityLoading: true,
      showCommunitySuggestions: true,
    });

    try {
      const communitySuggestions = await searchCommunities({
        district,
        q: query,
        limit: 8,
      });

      this.setData({
        communitySuggestions,
        showCommunitySuggestions: true,
        communityLoading: false,
      });
    } catch (error) {
      this.setData({
        communitySuggestions: [],
        showCommunitySuggestions: false,
        communityLoading: false,
      });
      console.warn("Community suggestion request failed.", getBaseUrl(), error);
    }
  },

  hideCommunitySuggestions() {
    setTimeout(() => {
      this.setData({
        showCommunitySuggestions: false,
      });
    }, 120);
  },

  selectCommunitySuggestion(event) {
    const { name, district } = event.currentTarget.dataset;
    const { districtOptions } = this.data;
    this.setData({
      communityName: name,
      district,
      districtIndex: districtOptions.indexOf(district),
      communitySuggestions: [],
      showCommunitySuggestions: false,
    });
    this.syncFormReady();
  },

  async submitForm() {
    if (this.data.submitting || !this.data.formReady) {
      return;
    }

    const { id, district, communityName, layoutIndex } = this.data;

    if (!district || !communityName.trim() || layoutIndex < 0) {
      wx.showToast({
        title: "请填写完整关注条件",
        icon: "none",
      });
      return;
    }

    const payload = {
      district,
      communityName: communityName.trim(),
      layout: layoutOptions[layoutIndex],
    };

    try {
      this.setData({ submitting: true });
      if (id) {
        await updateWatchItem(id, payload);
      } else {
        await createWatchItem(payload);
      }

      wx.showToast({
        title: this.data.isEdit ? "已更新关注" : "已保存关注",
        icon: "success",
      });

      setTimeout(() => {
        wx.navigateBack();
      }, 450);
    } catch (error) {
      wx.showToast({
        title: error.statusCode === 409 ? "这条关注已经存在" : "保存失败",
        icon: "none",
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
