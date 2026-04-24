const https = require("https");
const { URL } = require("url");

function normalizeDistrict(value = "") {
  const raw = String(value).replace(/区$/, "").trim();
  if (raw === "龙华") {
    return "龙华区";
  }
  return raw;
}

function normalizeBeikeCommunityUrl(sourceUrl) {
  const raw = String(sourceUrl || "").trim();
  if (!raw) {
    throw new Error("缺少贝壳小区链接");
  }

  const xiaoquMatch = raw.match(/ke\.com\/(?:xiaoqu|sz\/xiaoqu)\/(\d+)/);
  if (xiaoquMatch) {
    return `https://sz.ke.com/xiaoqu/${xiaoquMatch[1]}/`;
  }

  const ershoufangMatch = raw.match(/ke\.com\/ershoufang\/c(\d+)\//);
  if (ershoufangMatch) {
    return `https://sz.ke.com/xiaoqu/${ershoufangMatch[1]}/`;
  }

  throw new Error("请粘贴贝壳小区详情页链接");
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "accept-language": "zh-CN,zh;q=0.9",
          "accept-encoding": "identity",
          referer: "https://sz.ke.com/",
        },
      },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          const redirectUrl = new URL(response.headers.location, url).toString();
          fetchText(redirectUrl).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`贝壳页面请求失败：${response.statusCode}`));
          return;
        }

        response.setEncoding("utf8");
        let html = "";
        response.on("data", (chunk) => {
          html += chunk;
        });
        response.on("end", () => resolve(html));
      },
    );

    request.setTimeout(15000, () => {
      request.destroy(new Error("贝壳页面请求超时"));
    });
    request.on("error", reject);
  });
}

function detectBlocked(html) {
  return /<title>\s*CAPTCHA\s*<\/title>/i.test(html) || /访问已被拦截/.test(html);
}

function parseBathrooms(title, fallback) {
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
  return fallback || "";
}

function parseLayout(value = "") {
  const match = String(value).match(/(\d+)室/);
  return match ? `${match[1]}房` : "";
}

function parseNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function extractFatherOthers(html) {
  const match = html.match(/father_others:\s*(\{[\s\S]*?\})\s*,\s*isShowBriefData/);
  if (!match) {
    throw new Error("未找到贝壳小区数据块");
  }
  return JSON.parse(match[1]);
}

function mapBeikeProperty(item, watchItem, abstract, now) {
  const layout = parseLayout(item.roomNum || item.hallNum || item.jushi || watchItem.layout);
  const area = parseNumber(item.buildSize || item.area, 0);
  const totalPriceWan = parseNumber(item.price, 0);
  const source = "贝壳";
  const detailUrl = item.viewUrl || abstract.ershoufangUrl || watchItem.sourceUrl;
  const image = item.picture || "";
  const bathrooms = parseBathrooms(item.title, watchItem.bathrooms);
  const district = normalizeDistrict(abstract.district || watchItem.district);

  return {
    id: `beike-${item.houseCode || item.id || `${watchItem.id}-${totalPriceWan}-${area}`}`,
    watchId: watchItem.id,
    generated: false,
    communityName: abstract.name || watchItem.communityName,
    district,
    layout: layout || watchItem.layout,
    bathrooms,
    title: item.title || `${watchItem.communityName} ${watchItem.layout}`,
    totalPriceWan,
    unitPrice: parseNumber(item.unitPrice || abstract.unitPrice, 0),
    area,
    floor: "待补充",
    orientation: "待补充",
    source,
    updatedAt: now,
    listingCode: String(item.houseCode || item.id || ""),
    tags: ["真实采集"],
    reductionWan: 0,
    imageCount: image ? 1 : 0,
    hasVR: false,
    mediaLabels: image ? ["封面"] : ["暂无图片"],
    mediaImages: image ? [image] : [],
    description: "来自贝壳小区页的实时抓取结果。户型和价格已同步，楼层/朝向等字段待后续补强。",
    detailUrl,
    vrUrl: "",
    sourceUrl: watchItem.sourceUrl || "",
  };
}

async function scrapeBeikeWatch(watchItem, now) {
  const communityUrl = normalizeBeikeCommunityUrl(watchItem.sourceUrl);
  const html = await fetchText(communityUrl);

  if (detectBlocked(html)) {
    throw new Error("贝壳返回了验证码页，请稍后重试");
  }

  const fatherOthers = extractFatherOthers(html);
  const abstract = fatherOthers.abstract || {};
  const ershoufang = Array.isArray(abstract.ershoufang) ? abstract.ershoufang : [];
  const expectedLayout = watchItem.layout;

  const properties = ershoufang
    .map((item) => mapBeikeProperty(item, watchItem, abstract, now))
    .filter((item) => !expectedLayout || item.layout === expectedLayout);

  return {
    properties,
    meta: {
      communityUrl,
      sellCount: parseNumber(abstract.houseSellNum, properties.length),
      communityName: abstract.name || watchItem.communityName,
      district: normalizeDistrict(abstract.district || watchItem.district),
    },
  };
}

module.exports = {
  normalizeBeikeCommunityUrl,
  scrapeBeikeWatch,
};
