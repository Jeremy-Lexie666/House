const { getRuntimeConfig } = require("./config/env");

App({
  globalData: {
    brandName: "房价观察",
    apiBaseUrl: "",
    runtimeEnv: "develop",
    runtimeLabel: "本地开发",
  },

  onLaunch() {
    const runtimeConfig = getRuntimeConfig();
    this.globalData.apiBaseUrl = runtimeConfig.apiBaseUrl;
    this.globalData.runtimeEnv = runtimeConfig.env;
    this.globalData.runtimeLabel = runtimeConfig.label;

    if (
      runtimeConfig.env !== "develop" &&
      runtimeConfig.apiBaseUrl.indexOf("your-api-domain.com") !== -1
    ) {
      console.warn("Please update config/env.js with your deployed API domain.");
    }
  },
});
