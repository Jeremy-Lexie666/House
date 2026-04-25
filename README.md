# 房价观察小程序 MVP

一个微信原生小程序原型，围绕深圳少量关注小区做二手房在售列表观察。

## 现在已经有的能力

- 首页直接展示符合关注条件的在售房源
- 默认按总价从低到高排序
- 房源详情页，展示价格、参数、媒体摘要和原始链接
- 关注管理页，可新增、编辑、删除关注条件
- 刷新按钮，可手动刷新当前 mock 数据并更新时间
- 本地存储，关注条件和刷新结果会保存在微信本地缓存里

## 目录结构

```text
.
├── app.js
├── app.json
├── app.wxss
├── data/mock.js
├── pages
│   ├── add
│   └── index
│   ├── manage
│   └── property
├── services/communityService.js
└── utils
    ├── format.js
    └── storage.js
```

## 如何运行

1. 打开微信开发者工具
2. 选择“导入项目”
3. 项目目录指向当前文件夹
4. `AppID` 可先使用测试号或开发者工具提供的体验配置

## 环境配置

小程序现在已经拆成了 `develop / trial / release` 三套环境，配置在：

- [config/env.js](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/config/env.js)

默认规则：

- `develop`：本地开发，走 `http://127.0.0.1:8787`
- `trial`：体验版，默认占位为 `https://your-api-domain.com`
- `release`：正式版，默认占位为 `https://your-api-domain.com`

你上线前只需要把 `trial` 和 `release` 的 `apiBaseUrl` 改成自己的后端 HTTPS 域名。

如果想强制切某个环境调试，也可以在 `config/env.js` 里临时修改：

```js
const MANUAL_ENV = "trial";
```

调完再改回空字符串：

```js
const MANUAL_ENV = "";
```

## 这版的数据说明

- 当前小程序已经走本地后端 API，不再依赖前端 mock 刷新
- 新增或编辑的关注条件会写入后端 JSON 存储
- 保存关注、手动刷新、夜间自动刷新会共用同一条贝壳抓取链路
- 如果贝壳真实抓取失败，页面会保持空状态，不再补示例数据

## 下一步最值得接的部分

1. 抓取任务服务
   - 输入：小区名、地区、房型、卫生间数量
   - 输出：房源标题、总价、单价、面积、楼层、朝向、更新时间、图片数、VR 标记
2. 云函数或独立后端
   - 定时任务
   - 数据落库
   - 按关注条件筛出匹配房源
3. 小程序接口层
   - 用远端 API 替换本地 mock 数据
   - 让刷新按钮真正触发远端抓取

## 新增的本地 API 底盘

这次已经补了一个轻量本地后端骨架，方便把刷新和数据存储从前端里抽出去：

- 共享规则：[shared/houseDomain.js](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/shared/houseDomain.js)
- 本地 API：[backend/server.js](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/backend/server.js)
- 状态存储：`backend/data/store.json`（首次运行自动生成）
- 小区字典：[data/communityCatalog.js](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/data/communityCatalog.js)
- 小区字典数据文件：[data/communityCatalog.json](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/data/communityCatalog.json)

启动方式：

```bash
node backend/server.js
```

微信开发者工具里如果要请求本地接口，开发阶段通常需要关闭“校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。

## 上线前要改的地方

1. 部署后端，把 [backend/server.js](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/backend/server.js) 跑到你自己的 HTTPS 域名下
2. 修改 [config/env.js](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/config/env.js) 里的：
   - `trial.apiBaseUrl`
   - `release.apiBaseUrl`
3. 微信公众平台里配置服务器域名
4. 真机先测体验版，再提交审核

一个简单示例：

```js
trial: {
  label: "体验版",
  apiBaseUrl: "https://api.house-watch.example.com",
},
release: {
  label: "正式版",
  apiBaseUrl: "https://api.house-watch.example.com",
},
```

## 后端部署准备

项目根目录现在已经有 [package.json](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/package.json) 和 [.env.example](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/.env.example)。

本地开发：

```bash
npm start
```

生产启动：

```bash
NODE_ENV=production npm run start:prod
```

生产模式下，后端默认会：

- 监听 `0.0.0.0:8787`
- 使用独立存储文件 `backend/data/store.prod.json`
- 以空数据启动，不自动写入演示房源

你也可以通过环境变量覆盖：

- `PORT`
- `HOST`
- `ALLOW_ORIGIN`
- `STORE_PATH`
- `SEED_MODE`
- `AUTO_REFRESH_ENABLED`
- `AUTO_REFRESH_HOUR`
- `AUTO_REFRESH_MINUTE`

如果你希望后端每天凌晨自动抓一次最新房源，生产环境建议开启：

```bash
AUTO_REFRESH_ENABLED=true
AUTO_REFRESH_HOUR=0
AUTO_REFRESH_MINUTE=30
```

当前这版已经支持：

- 用户保存关注条件时不再手填贝壳小区链接
- 后端刷新时自动根据 `小区 + 区域` 去贝壳搜索建议接口解析小区页
- 手动点击刷新和自动定时刷新共用同一条抓取链路
- 当纯 HTTP 请求撞上贝壳验证码时，可选回退到本地 Chrome 浏览器会话抓取

如果你准备用服务器常驻运行，项目里也已经带了：

- [ecosystem.config.cjs](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/ecosystem.config.cjs)
- [deploy/DEPLOYMENT.md](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/deploy/DEPLOYMENT.md)
- [deploy/nginx.house-watch.conf.example](/Users/jeremy/Desktop/Vibe%20Coding/Codex/房子/deploy/nginx.house-watch.conf.example)

推荐的生产托管方式：

```bash
pm2 start ecosystem.config.cjs --env production
```

## 贝壳浏览器会话抓取

贝壳公开页现在会不稳定地把服务器请求重定向到验证码页，所以项目里加了一条更重但更有机会的兜底链路：

1. 先用本机 Chrome 建立一次可复用的贝壳登录会话
2. 保存关注 / 点击刷新时，后端先匿名解析小区链接
3. 真正抓在售房源列表时，直接复用 Playwright + Chrome 持久会话

第一次使用前，先执行：

```bash
npm install
npm run beike:login
```

执行后会打开本机 Chrome。你需要在浏览器里完成贝壳登录和人机验证，成功后会把会话信息保存到：

```text
backend/data/browser-session/beike
```

后续再刷新时，后端会尝试复用这个会话。

相关环境变量：

- `BEIKE_BROWSER_ENABLED`
- `BEIKE_BROWSER_HEADLESS`
- `BEIKE_BROWSER_SESSION_DIR`
- `BEIKE_CHROME_PATH`

默认开发环境会尝试启用这个登录态抓取方案，但它依旧不是完全稳定的长期方案；如果贝壳再次强制验证码或登录失效，页面会继续显示抓取失败。

## 风险边界

这个原型的产品方向是“只盯你手动关注的小区”。即便如此，后续真实采集也依然建议：

- 只抓公开页
- 保持低频
- 不碰登录态
- 不做批量全站抓取

这样更接近一个克制的个人监控工具，而不是大规模数据搬运。
