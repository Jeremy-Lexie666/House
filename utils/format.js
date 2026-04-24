function formatCurrencyWan(value) {
  return `${Number(value).toLocaleString("zh-CN")}万`;
}

function formatUnitPrice(value) {
  return `${Math.round(Number(value)).toLocaleString("zh-CN")}元/平`;
}

function formatArea(value) {
  return `${Number(value).toFixed(2)}平`;
}

function getRelativeLabel(dateTime) {
  const input = new Date(dateTime.replace(/-/g, "/")).getTime();
  const now = Date.now();
  const diff = now - input;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Number.isNaN(input)) {
    return dateTime;
  }
  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)} 小时前`;
  }
  return `${Math.floor(diff / day)} 天前`;
}

function sortByNumberAsc(items, key) {
  return [...items].sort((a, b) => a[key] - b[key]);
}

module.exports = {
  formatArea,
  formatCurrencyWan,
  formatUnitPrice,
  getRelativeLabel,
  sortByNumberAsc,
};
