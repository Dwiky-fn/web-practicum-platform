const DeadlineProcessorService = require('./DeadlineProcessorService');

const INTERVAL_MS = 60 * 1000;

let intervalHandle = null;
let isRunning = false;

async function runOnce(reason = 'scheduled') {
  if (isRunning) return null;
  isRunning = true;

  try {
    const summary = await DeadlineProcessorService.processExpiredDeadlines();
    if (summary.jobsheetClasses || summary.touched) {
      console.log(
        `[Deadline Scheduler] ${reason}: ${summary.jobsheetClasses} publish lewat deadline, ` +
        `${summary.created} auto-submit baru, ${summary.updated} draft dikunci, ${summary.scored || 0} snapshot nilai.`,
      );
    }
    return summary;
  } catch (error) {
    console.error('[Deadline Scheduler] Gagal memproses deadline:', error);
    return null;
  } finally {
    isRunning = false;
  }
}

function start() {
  if (intervalHandle) return;

  runOnce('startup');
  intervalHandle = setInterval(() => {
    runOnce('scheduled');
  }, INTERVAL_MS);
}

function stop() {
  if (!intervalHandle) return;
  clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = {
  INTERVAL_MS,
  runOnce,
  start,
  stop,
};
