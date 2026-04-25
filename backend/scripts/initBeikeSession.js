const { loadState } = require("../store");
const { resolveBeikeCommunityUrl, toBeikeListingUrl } = require("../sources/beike");
const { initBeikeBrowserSession } = require("../sources/beikeBrowser");

async function getBootstrapUrl() {
  const state = loadState();
  const watchItem = Array.isArray(state.watchlist) && state.watchlist.length ? state.watchlist[0] : null;
  if (!watchItem) {
    return "https://sz.ke.com/";
  }

  try {
    return toBeikeListingUrl(await resolveBeikeCommunityUrl(watchItem));
  } catch (error) {
    console.warn(`Could not resolve watch community URL, fallback to homepage: ${error.message}`);
    return "https://sz.ke.com/";
  }
}

async function main() {
  try {
    const initialUrl = await getBootstrapUrl();
    console.log("Opening Chrome for Beike session bootstrap...");
    console.log("If Beike shows a login or CAPTCHA page, complete it in the browser window.");
    console.log(`Bootstrap page: ${initialUrl}`);
    await initBeikeBrowserSession({
      initialUrl,
    });
    console.log("Beike browser session is ready.");
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
