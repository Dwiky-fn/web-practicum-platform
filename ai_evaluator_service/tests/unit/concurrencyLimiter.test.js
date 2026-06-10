const test = require('node:test');
const assert = require('node:assert/strict');

const ConcurrencyLimiter = require('../../src/utils/concurrencyLimiter');

test('limiter hanya menjalankan satu task pada satu waktu', async () => {
  const limiter = new ConcurrencyLimiter(1);
  let active = 0;
  let maximumActive = 0;

  const task = () => limiter.run(async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 10));
    active -= 1;
  });

  await Promise.all([task(), task(), task()]);
  assert.equal(maximumActive, 1);
});
