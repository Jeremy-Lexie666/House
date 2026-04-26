const { getRuntimeConfig } = require("./config/env");

const CLIENT_ID_STORAGE_KEY = "house_watch_client_id";

function createClientId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `client_${Date.now()}_${random}`;
}

App({
  globalData: {
    brandName: "房价观察",
    apiBaseUrl: "",
    runtimeEnv: "develop",
    runtimeLabel: "本地开发",
    clientId: "",
  },

  onLaunch() {
    const runtimeConfig = getRuntimeConfig();
    let clientId = "";

    try {
      clientId = wx.getStorageSync(CLIENT_ID_STORAGE_KEY);
      if (!clientId) {
        clientId = createClientId();
        wx.setStorageSync(CLIENT_ID_STORAGE_KEY, clientId);
      }
    } catch (error) {
      clientId = createClientId();
      console.warn("Failed to persist local client id.", error);
    }

    this.globalData.apiBaseUrl = runtimeConfig.apiBaseUrl;
    this.globalData.runtimeEnv = runtimeConfig.env;
    this.globalData.runtimeLabel = runtimeConfig.label;
    this.globalData.clientId = clientId;

    if (
      runtimeConfig.env !== "develop" &&
      runtimeConfig.apiBaseUrl.indexOf("your-api-domain.com") !== -1
    ) {
      console.warn("Please update config/env.js with your deployed API domain.");
    }
  },
});
