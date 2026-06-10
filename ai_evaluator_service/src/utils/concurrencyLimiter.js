class ConcurrencyLimiter {
  constructor(maxConcurrent = 1) {
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
      throw new Error('maxConcurrent minimal 1');
    }

    this.maxConcurrent = maxConcurrent;
    this.activeCount = 0;
    this.queue = [];
  }

  run(task) {
    if (typeof task !== 'function') {
      return Promise.reject(new TypeError('Task harus berupa function'));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  processQueue() {
    while (
      this.activeCount < this.maxConcurrent
      && this.queue.length > 0
    ) {
      const item = this.queue.shift();
      this.activeCount += 1;

      Promise.resolve()
        .then(item.task)
        .then(item.resolve, item.reject)
        .finally(() => {
          this.activeCount -= 1;
          this.processQueue();
        });
    }
  }

  getPendingCount() {
    return this.queue.length;
  }

  getActiveCount() {
    return this.activeCount;
  }
}

module.exports = ConcurrencyLimiter;
