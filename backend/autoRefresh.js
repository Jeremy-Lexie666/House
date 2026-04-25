const { loadState, saveState } = require("./store");
const { refreshStateWithSources } = require("./refreshSources");

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getNextRunDelay(hour, minute) {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(hour, minute, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return nextRun.getTime() - now.getTime();
}

function startAutoRefresh({ enabled, hour = 0, minute = 30, logger = console }) {
  if (!enabled) {
    return () => {};
  }

  let timer = null;
  let stopped = false;

  async function runAndSchedule() {
    if (stopped) {
      return;
    }

    try {
      const nextState = await refreshStateWithSources(loadState());
      saveState(nextState);
      logger.log(`[auto-refresh] completed at ${new Date().toISOString()}`);
    } catch (error) {
      logger.error("[auto-refresh] failed:", error.message);
    } finally {
      if (!stopped) {
        const delay = getNextRunDelay(hour, minute);
        timer = setTimeout(runAndSchedule, delay);
        logger.log(`[auto-refresh] next run in ${Math.round(delay / 1000)}s`);
      }
    }
  }

  const initialDelay = getNextRunDelay(toNumber(hour, 0), toNumber(minute, 30));
  timer = setTimeout(runAndSchedule, initialDelay);
  logger.log(`[auto-refresh] scheduled first run in ${Math.round(initialDelay / 1000)}s`);

  return () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
}

module.exports = {
  startAutoRefresh,
};
