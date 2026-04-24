# Deployment Guide

## 目标

把当前 Node 后端部署到一台云服务器上，并通过 `pm2 + nginx + HTTPS` 提供给微信小程序调用。

## 建议环境

- Ubuntu 22.04 LTS
- Node.js 20
- pm2
- nginx

## 1. 上传代码

推荐直接从 Git 拉代码：

```bash
git clone <your-repo-url>
cd 房子
```

## 2. 安装依赖

当前后端没有第三方 npm 依赖，但建议先确认 Node 正常：

```bash
node -v
npm -v
```

## 3. 准备生产参数

参考 [.env.example](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/.env.example)。

当前最重要的是：

- `NODE_ENV=production`
- `PORT=8787`
- `STORE_PATH=./backend/data/store.prod.json`
- `SEED_MODE=empty`

## 4. 用 pm2 启动

项目已经带了 [ecosystem.config.cjs](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/ecosystem.config.cjs)。

启动生产环境：

```bash
pm2 start ecosystem.config.cjs --env production
```

查看状态：

```bash
pm2 status
pm2 logs house-watch-api
```

保存开机自启：

```bash
pm2 save
pm2 startup
```

## 5. 配置 nginx

示例配置见：

- [deploy/nginx.house-watch.conf.example](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/deploy/nginx.house-watch.conf.example)

核心目标是把：

- `https://api.house-watch.example.com`

反代到：

- `http://127.0.0.1:8787`

## 6. 配置 HTTPS

微信小程序正式环境请求后端时，接口域名应使用 HTTPS。

常见做法：

- Let's Encrypt
- 云厂商证书服务

证书配完后，再把小程序里的：

- [config/env.js](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/config/env.js)

改成你的正式 API 域名。

## 7. 微信公众平台配置

到微信公众平台后台，把你的 API 域名加入：

- 服务器域名

体验版和正式版都建议走同一个 HTTPS 域名，避免来回切。

## 8. 发布前检查

1. `GET /health` 可访问
2. `GET /api/feed` 正常返回 JSON
3. 小程序体验版能请求成功
4. 生产库是空白初始化，不带演示房源
5. `trial` / `release` 环境都已改成正式域名

## 备注

当前真实抓取链路已经接上，但贝壳仍可能返回验证码页。所以“服务能上线”不等于“真实采集已完全稳定”。上线前建议你先把体验版真机压一轮。
