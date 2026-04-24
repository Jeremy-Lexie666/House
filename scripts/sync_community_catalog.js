const fs = require("fs");
const path = require("path");

const catalogPath = path.join(__dirname, "..", "data", "communityCatalog.json");

function normalizeDistrict(value) {
  const district = String(value).trim();
  if (district === "龙华") {
    return "龙华区";
  }
  return district;
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

const nextCatalog = normalizeCatalog(loadCatalog());
saveCatalog(nextCatalog);

console.log(`Synced ${nextCatalog.length} community records -> ${catalogPath}`);
