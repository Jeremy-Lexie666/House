const rawCommunityCatalog = require("./communityCatalog.json");

function normalizeDistrict(value) {
  const district = String(value).trim();
  if (district === "龙华") {
    return "龙华区";
  }
  return district;
}

const communityCatalog = rawCommunityCatalog.map((item) => ({
  ...item,
  district: normalizeDistrict(item.district),
}));

function getDistrictOptions() {
  return [...new Set(communityCatalog.map((item) => item.district))];
}

function searchCommunities({ district = "", query = "", limit = 8 }) {
  const q = String(query).trim();
  const normalizedDistrict = district ? normalizeDistrict(district) : "";
  const scoped = communityCatalog.filter(
    (item) => !normalizedDistrict || item.district === normalizedDistrict,
  );

  const result = !q
    ? scoped
    : scoped
        .filter((item) => item.name.includes(q))
        .sort((a, b) => {
          const aStarts = a.name.startsWith(q) ? 1 : 0;
          const bStarts = b.name.startsWith(q) ? 1 : 0;
          return bStarts - aStarts || a.name.length - b.name.length;
        });

  return result.slice(0, limit);
}

module.exports = {
  communityCatalog,
  getDistrictOptions,
  normalizeDistrict,
  searchCommunities,
};
