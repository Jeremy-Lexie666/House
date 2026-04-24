const fs = require("fs");
const https = require("https");
const path = require("path");

const catalogPath = path.join(__dirname, "..", "data", "communityCatalog.json");
const baseListUrl = "https://m.fang.com/fangjia/sz_list_pinggu__/";
const ajaxListUrl = "https://m.fang.com/fangjia/sz_list_ajax__/";
const shenzhenDistricts = new Set([
  "福田",
  "罗湖",
  "南山",
  "盐田",
  "宝安",
  "龙华区",
  "龙岗",
  "坪山区",
  "大鹏新区",
  "光明区",
  "深汕合作区",
]);

function normalizeDistrict(value) {
  const district = String(value).trim();
  if (district === "龙华") {
    return "龙华区";
  }
  return district;
}

function parseArgs(argv) {
  const options = {
    delayMs: 80,
    retries: 3,
    scopeLimit: null,
    maxPagesPerScope: 120,
  };

  argv.forEach((arg) => {
    if (arg.startsWith("--delay-ms=")) {
      options.delayMs = Number(arg.split("=")[1]) || options.delayMs;
    } else if (arg.startsWith("--retries=")) {
      options.retries = Number(arg.split("=")[1]) || options.retries;
    } else if (arg.startsWith("--scope-limit=")) {
      options.scopeLimit = Number(arg.split("=")[1]) || null;
    } else if (arg.startsWith("--max-pages-per-scope=")) {
      options.maxPagesPerScope = Number(arg.split("=")[1]) || options.maxPagesPerScope;
    }
  });

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
          "accept-language": "zh-CN,zh;q=0.9",
          "accept-encoding": "identity",
          referer: "https://m.fang.com/",
        },
      },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          res.resume();
          const redirectUrl = new URL(res.headers.location, url).toString();
          requestText(redirectUrl).then(resolve).catch(reject);
          return;
        }

        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Request failed: ${res.statusCode} ${url}`));
          return;
        }

        res.setEncoding("utf8");
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => resolve(raw));
      },
    );

    req.setTimeout(15000, () => {
      req.destroy(new Error(`Request timeout: ${url}`));
    });
    req.on("error", reject);
  });
}

async function requestWithRetry(url, retries) {
  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      return await requestText(url);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(300 * attempt);
      }
    }
  }

  throw lastError;
}

function decodeHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&middot;/g, "·")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function extractConfig(html) {
  const totalMatch = html.match(/pageConfig\.total='(\d+)'/);
  const pageSizeMatch = html.match(/pageConfig\.pagesize='(\d+)'/);
  const ajaxUrlMatch = html.match(/pageConfig\.ajaxUrl='([^']+)'/);

  if (!totalMatch || !pageSizeMatch || !ajaxUrlMatch) {
    throw new Error("Failed to extract total/pagesize/ajaxUrl from 房天下 page.");
  }

  return {
    total: Number(totalMatch[1]),
    pageSize: Number(pageSizeMatch[1]),
    ajaxUrl: ajaxUrlMatch[1],
  };
}

function extractCommunities(html) {
  const items = [];
  const liRegex = /<li\b[\s\S]*?<\/li>/g;
  const blocks = html.match(liRegex) || [];

  blocks.forEach((block) => {
    const nameMatch = block.match(/<h3>([\s\S]*?)<\/h3>/);
    const areaMatch = block.match(/<p class="x-intro">[\s\S]*?<span class="">([\s\S]*?)<\/span>/);

    if (!nameMatch || !areaMatch) {
      return;
    }

    const name = decodeHtml(nameMatch[1]);
    const areaText = decodeHtml(areaMatch[1]);
    const [districtRaw] = areaText.split("-");
    const district = normalizeDistrict(districtRaw);

    if (!name || !district || !shenzhenDistricts.has(district)) {
      return;
    }

    items.push({
      district,
      name,
    });
  });

  return items;
}

function loadCatalog() {
  return JSON.parse(fs.readFileSync(catalogPath, "utf8"));
}

function normalizeCatalog(items) {
  const seen = new Set();

  return items
    .filter((item) => item && item.name && item.district)
    .map((item) => ({
      district: normalizeDistrict(item.district),
      name: String(item.name).trim(),
    }))
    .filter((item) => {
      const key = `${item.district}__${item.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      if (a.district === b.district) {
        return a.name.localeCompare(b.name, "zh-Hans-CN");
      }
      return a.district.localeCompare(b.district, "zh-Hans-CN");
    });
}

function saveCatalog(items) {
  fs.writeFileSync(catalogPath, `${JSON.stringify(items, null, 2)}\n`);
}

function extractDistrictMap(html) {
  const map = new Map();
  const districtRegex = /<li data-id='(\d+)' class='[^']*'\s*>([^<]+)<\/li>/g;
  let match = districtRegex.exec(html);

  while (match) {
    const [, id, nameRaw] = match;
    const name = decodeHtml(nameRaw);
    if (shenzhenDistricts.has(name)) {
      map.set(id, name);
    }
    match = districtRegex.exec(html);
  }

  return map;
}

function extractCommerceScopes(html) {
  const districtMap = extractDistrictMap(html);
  const scopes = [];
  const blockRegex = /<ul class="n3 comareabox" id="districts_(\d+)"[\s\S]*?>([\s\S]*?)<\/ul>/g;
  let blockMatch = blockRegex.exec(html);

  while (blockMatch) {
    const [, districtId, blockHtml] = blockMatch;
    const districtName = districtMap.get(districtId);

    if (districtName) {
      const commerceRegex =
        /<li data-href='(https:\/\/m\.fang\.com\/fangjia\/sz_list_pinggu_[^']+\/)'>([^<]+)<\/li>/g;
      let commerceMatch = commerceRegex.exec(blockHtml);

      while (commerceMatch) {
        const [, url, commerceRaw] = commerceMatch;
        const commerce = decodeHtml(commerceRaw);

        if (commerce && commerce !== "不限") {
          scopes.push({
            district: districtName,
            commerce,
            url,
          });
        }

        commerceMatch = commerceRegex.exec(blockHtml);
      }
    }

    blockMatch = blockRegex.exec(html);
  }

  return scopes;
}

function buildAjaxPageUrl(config, page) {
  return `${config.ajaxUrl}${config.ajaxUrl.includes("?") ? "&" : "?"}page=${page}`;
}

function toItemKey(item) {
  return `${item.district}__${item.name}`;
}

async function scrapeScope(scope, options, globalSeen) {
  const landingHtml = await requestWithRetry(scope.url, options.retries);
  const config = extractConfig(landingHtml);
  const totalPages = Math.ceil(config.total / config.pageSize);
  const signatures = new Set();
  const scopedItems = [];
  const landingItems = extractCommunities(landingHtml);
  const landingSignature = landingItems.map(toItemKey).join("||");
  let repeatedPages = 0;

  signatures.add(landingSignature);
  landingItems.forEach((item) => {
    const key = toItemKey(item);
    if (!globalSeen.has(key)) {
      globalSeen.add(key);
      scopedItems.push(item);
    }
  });

  const endPage = Math.min(totalPages, options.maxPagesPerScope);

  for (let page = 2; page <= endPage; page += 1) {
    const html = await requestWithRetry(buildAjaxPageUrl(config, page), options.retries);
    const pageItems = extractCommunities(html);
    const signature = pageItems.map(toItemKey).join("||");

    if (!pageItems.length || signatures.has(signature)) {
      repeatedPages += 1;
      if (repeatedPages >= 1) {
        break;
      }
      continue;
    }

    signatures.add(signature);
    repeatedPages = 0;

    pageItems.forEach((item) => {
      const key = toItemKey(item);
      if (!globalSeen.has(key)) {
        globalSeen.add(key);
        scopedItems.push(item);
      }
    });

    if (page % 20 === 0 || page === endPage) {
      console.log(
        `  ${scope.district}-${scope.commerce}: page ${page}/${Math.min(totalPages, endPage)}, newUnique=${scopedItems.length}`,
      );
    }

    if (options.delayMs > 0 && page < endPage) {
      await sleep(options.delayMs);
    }
  }

  return {
    config,
    items: scopedItems,
  };
}

async function scrapeAllScopes(options) {
  const rootHtml = await requestWithRetry(baseListUrl, options.retries);
  const rootConfig = extractConfig(rootHtml);
  const scopes = extractCommerceScopes(rootHtml);
  const scopedList = options.scopeLimit ? scopes.slice(0, options.scopeLimit) : scopes;
  const globalSeen = new Set();
  const collected = [];
  const rootItems = extractCommunities(rootHtml);

  rootItems.forEach((item) => {
    const key = toItemKey(item);
    if (!globalSeen.has(key)) {
      globalSeen.add(key);
      collected.push(item);
    }
  });

  console.log(
    `Found ${scopedList.length} commerce scopes from root page. Root total=${rootConfig.total}, root pageSize=${rootConfig.pageSize}.`,
  );

  for (let index = 0; index < scopedList.length; index += 1) {
    const scope = scopedList[index];
    console.log(`[${index + 1}/${scopedList.length}] ${scope.district}-${scope.commerce}`);
    const result = await scrapeScope(scope, options, globalSeen);
    collected.push(...result.items);

    console.log(
      `  done: total=${result.config.total}, uniqueAdded=${result.items.length}, cumulativeUnique=${globalSeen.size}`,
    );
  }

  return {
    rootConfig,
    scopeCount: scopedList.length,
    collected,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const existing = loadCatalog();
  const { collected, scopeCount } = await scrapeAllScopes(options);
  const merged = normalizeCatalog([...existing, ...collected]);

  saveCatalog(merged);

  console.log(
    `Merged ${collected.length} scraped entries into catalog. Final unique communities: ${merged.length}.`,
  );
  console.log(`Source scopes processed: ${scopeCount}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
