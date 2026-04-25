const path = require("path");
const { chromium } = require("playwright-core");
const { resolveChromePath } = require("../config");
const {
  detectBlocked,
  detectLoginRequired,
  extractFatherOthers,
  mapBeikeProperty,
  normalizeBeikeCommunityUrl,
  resolveBeikeCommunityUrl,
  toBeikeListingUrl,
} = require("./beike");

const DEFAULT_CHROME_PATH = resolveChromePath();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchBeikeContext(options = {}) {
  const userDataDir =
    options.userDataDir ||
    path.join(process.cwd(), "backend", "data", "browser-session", "beike");

  return chromium.launchPersistentContext(userDataDir, {
    executablePath: options.executablePath || process.env.BEIKE_CHROME_PATH || DEFAULT_CHROME_PATH,
    headless: Boolean(options.headless),
    viewport: {
      width: 1440,
      height: 900,
    },
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

function getPrimaryPage(context) {
  const pages = context.pages();
  if (pages.length) {
    return pages[0];
  }
  return context.newPage();
}

function parseNumber(value, fallback = 0) {
  const normalized = String(value || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!normalized) {
    return fallback;
  }
  const number = Number(normalized[1]);
  return Number.isFinite(number) ? number : fallback;
}

function parseLayoutFromHouseInfo(houseInfo = "", fallback = "") {
  const match = String(houseInfo).match(/(\d+)室/);
  return match ? `${match[1]}房` : fallback;
}

function parseAreaFromHouseInfo(houseInfo = "", fallback = 0) {
  const match = String(houseInfo).match(/(\d+(?:\.\d+)?)平米/);
  return match ? Number(match[1]) : fallback;
}

function parseOrientationFromHouseInfo(houseInfo = "", fallback = "") {
  const segments = String(houseInfo)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  return segments[segments.length - 1] || fallback;
}

function parseFloorFromHouseInfo(houseInfo = "", fallback = "") {
  const match = String(houseInfo).match(/(低楼层|中楼层|高楼层[^|]*)/);
  return match ? match[1].trim() : fallback;
}

function parseBathroomsFromTitle(title = "", fallback = "") {
  const raw = String(title || "");
  if (/(三|3)卫/.test(raw)) {
    return "3卫+";
  }
  if (/(两|2)卫/.test(raw)) {
    return "2卫";
  }
  if (/(一|1)卫/.test(raw)) {
    return "1卫";
  }
  return fallback;
}

function mapBrowserProperty(item, watchItem, now, communityUrl, listingUrl) {
  const layout = parseLayoutFromHouseInfo(item.houseInfo, watchItem.layout);
  const area = parseAreaFromHouseInfo(item.houseInfo, 0);
  const detailUrl = item.detailUrl || "";
  const listingCodeMatch = detailUrl.match(/\/ershoufang\/(\d+)\.html/);
  const listingCode = listingCodeMatch ? listingCodeMatch[1] : "";
  const mediaImages = item.image ? [item.image] : [];
  const tags = Array.isArray(item.tags) && item.tags.length ? item.tags : ["真实采集"];

  return {
    id: `beike-${listingCode || `${watchItem.id}-${item.totalPriceWan}-${area}`}`,
    watchId: watchItem.id,
    generated: false,
    communityName: watchItem.communityName,
    district: watchItem.district,
    layout,
    bathrooms: parseBathroomsFromTitle(item.title, watchItem.bathrooms),
    title: item.title || `${watchItem.communityName} ${watchItem.layout}`,
    totalPriceWan: item.totalPriceWan,
    unitPrice: item.unitPrice,
    area,
    floor: parseFloorFromHouseInfo(item.houseInfo, "待补充"),
    orientation: parseOrientationFromHouseInfo(item.houseInfo, "待补充"),
    source: "贝壳",
    updatedAt: now,
    listingCode,
    tags,
    reductionWan: 0,
    imageCount: mediaImages.length,
    hasVR: tags.includes("VR房源"),
    mediaLabels: tags.length ? tags : ["暂无标签"],
    mediaImages,
    description: item.desc || "来自贝壳登录态列表页的实时抓取结果。",
    detailUrl,
    vrUrl: tags.includes("VR房源") ? detailUrl : "",
    sourceUrl: communityUrl,
    listingUrl,
  };
}

async function extractListingCards(page) {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll("ul.sellListContent > li.clear"));
    return items.map((item) => {
      const titleLink =
        item.querySelector(".title a") ||
        item.querySelector("a.maidian-detail") ||
        item.querySelector("a[href*='/ershoufang/']");
      const priceInfo = item.querySelector(".priceInfo");
      const totalPriceEl = item.querySelector(".totalPrice");
      const unitPriceEl = item.querySelector(".unitPrice");
      const tagNodes = Array.from(item.querySelectorAll(".tag span"));
      const imageEl = item.querySelector("img");

      return {
        title: titleLink ? (titleLink.textContent || "").trim() : "",
        detailUrl: titleLink ? titleLink.href : "",
        houseInfo: ((item.querySelector(".houseInfo") || {}).textContent || "").replace(/\s+/g, " ").trim(),
        desc: ((item.querySelector(".title") || {}).textContent || "").replace(/\s+/g, " ").trim(),
        totalPriceWan: parseFloat((((totalPriceEl || {}).textContent || "").replace(/\s+/g, ""))) || 0,
        unitPrice:
          parseFloat((((unitPriceEl || priceInfo || {}).textContent || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)元\/平/) || [])[1]) || 0,
        tags: tagNodes
          .map((node) => (node.textContent || "").trim())
          .filter(Boolean),
        image: imageEl ? imageEl.src || imageEl.getAttribute("data-original") || "" : "",
      };
    });
  });
}

async function waitForAccessReady(page, timeoutMs = 180000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const html = await page.content();
      if (
        !detectBlocked(html) &&
        !/hip\.ke\.com\/captcha/.test(page.url()) &&
        !detectLoginRequired(page.url(), html)
      ) {
        return true;
      }
    } catch (error) {
      if (!/page is navigating/i.test(error.message || "")) {
        throw error;
      }
    }
    await sleep(1500);
  }

  return false;
}

async function scrapeBeikeWatchWithBrowser(watchItem, now, options = {}) {
  const sourceUrl = watchItem.sourceUrl || (await resolveBeikeCommunityUrl(watchItem));
  const communityUrl = normalizeBeikeCommunityUrl(sourceUrl);
  const listingUrl = toBeikeListingUrl(sourceUrl);
  const context = await launchBeikeContext(options);

  try {
    const page = await getPrimaryPage(context);
    await page.goto(communityUrl, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs || 30000,
    });

    let html = await page.content();
    if (detectBlocked(html) || /hip\.ke\.com\/captcha/.test(page.url())) {
      if (!options.allowInteractiveCaptcha) {
        throw new Error("贝壳浏览器会话仍需验证码，请先执行 beike:login 完成人工验证");
      }

      const passed = await waitForAccessReady(page, options.captchaTimeoutMs || 180000);
      if (!passed) {
        throw new Error("人工验证码超时，未能建立可复用的贝壳浏览器会话");
      }
      html = await page.content();
    }

    await page.goto(listingUrl, {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs || 30000,
    });
    html = await page.content();
    if (detectLoginRequired(page.url(), html)) {
      if (!options.allowInteractiveCaptcha) {
        throw new Error("贝壳在售列表页需要登录，请先执行 beike:login 并在 Chrome 中完成登录");
      }

      const passed = await waitForAccessReady(page, options.captchaTimeoutMs || 180000);
      if (!passed) {
        throw new Error("贝壳登录或验证超时，未能建立可复用的在售列表会话");
      }
      html = await page.content();
    }
    const listItems = await extractListingCards(page);
    const expectedLayout = watchItem.layout;
    const properties = listItems
      .map((item) => mapBrowserProperty(item, watchItem, now, communityUrl, listingUrl))
      .filter((item) => !expectedLayout || item.layout === expectedLayout);

    return {
      properties,
      meta: {
        communityUrl,
        communityName: watchItem.communityName,
        district: watchItem.district,
      },
    };
  } finally {
    await context.close();
  }
}

async function initBeikeBrowserSession(options = {}) {
  const context = await launchBeikeContext({
    ...options,
    headless: false,
  });

  try {
    const page = await getPrimaryPage(context);
    await page.goto(options.initialUrl || "https://sz.ke.com/", {
      waitUntil: "domcontentloaded",
      timeout: options.timeoutMs || 30000,
    });

    const passed = await waitForAccessReady(page, options.captchaTimeoutMs || 300000);
    if (!passed) {
      throw new Error("初始化贝壳浏览器会话失败：请在打开的浏览器里完成登录/验证后重试");
    }
  } finally {
    await context.close();
  }
}

module.exports = {
  initBeikeBrowserSession,
  scrapeBeikeWatchWithBrowser,
};
