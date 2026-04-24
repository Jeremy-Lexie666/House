module.exports = {
  apps: [
    {
      name: "house-watch-api",
      script: "backend/server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "development",
        HOST: "0.0.0.0",
        PORT: 8787,
        ALLOW_ORIGIN: "*",
        STORE_PATH: "./backend/data/store.json",
        SEED_MODE: "seed",
      },
      env_production: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 8787,
        ALLOW_ORIGIN: "https://servicewechat.com",
        STORE_PATH: "./backend/data/store.prod.json",
        SEED_MODE: "empty",
      },
    },
  ],
};
