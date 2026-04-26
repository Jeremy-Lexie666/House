const ENVIRONMENTS = {
  develop: {
    label: "本地开发",
    apiBaseUrl: "http://127.0.0.1:8787",
  },
  trial: {
    label: "体验版",
    apiBaseUrl: "https://api.4567l.com",
  },
  release: {
    label: "正式版",
    apiBaseUrl: "https://api.4567l.com",
  },
};

const MANUAL_ENV = "";

function getMiniProgramEnvVersion() {
  try {
    if (typeof wx !== "undefined" && typeof wx.getAccountInfoSync === "function") {
      const accountInfo = wx.getAccountInfoSync();
      const envVersion = accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.envVersion;
      if (envVersion) {
        return envVersion;
      }
    }
  } catch (error) {
    console.warn("Failed to read mini-program envVersion.", error);
  }

  return "develop";
}

function resolveRuntimeEnv() {
  const env = MANUAL_ENV || getMiniProgramEnvVersion();
  if (ENVIRONMENTS[env]) {
    return env;
  }

  return "develop";
}

function getRuntimeConfig() {
  const env = resolveRuntimeEnv();
  return {
    env,
    ...ENVIRONMENTS[env],
  };
}

module.exports = {
  ENVIRONMENTS,
  MANUAL_ENV,
  getRuntimeConfig,
  resolveRuntimeEnv,
};
