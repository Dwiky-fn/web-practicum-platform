const test = require('node:test');
const assert = require('node:assert/strict');
const tracker = require('../src/services/execution/RunningExecutionsTracker');

test('RunningExecutionsTracker melacak proses koding yang sedang berjalan', () => {
  // Clear any state if needed (though it should be empty initially)
  tracker._running.clear();

  const ctxNormalExp1 = {
    kelasPraktikumId: 'kp-1',
    jobsheetId: 'js-1',
    attemptType: 'normal',
    remedialId: null,
    moduleType: 'experiment',
    experimentId: 'exp-1',
    instructionId: 'exp-1:step:1',
  };

  const ctxRemedialExp1 = {
    ...ctxNormalExp1,
    attemptType: 'remedial',
    remedialId: 'rem-abc',
  };

  const ctxNormalEx1 = {
    kelasPraktikumId: 'kp-1',
    jobsheetId: 'js-1',
    attemptType: 'normal',
    remedialId: null,
    moduleType: 'exercise',
    exerciseId: 'ex-1',
  };

  // 1. Initial counts should be 0
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'normal',
      null,
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    0,
  );
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'remedial',
      'rem-abc',
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    0,
  );
  assert.equal(
    tracker.getRunningCount('kp-1', 'js-1', 'normal', null, 'exercise', 'ex-1'),
    0,
  );

  // 2. Add normal experiment execution
  tracker.add('exec-1', 'student-a', ctxNormalExp1);
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'normal',
      null,
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    1,
  );
  // Other count remains 0
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'remedial',
      'rem-abc',
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    0,
  );

  // 3. Add second execution for same location
  tracker.add('exec-2', 'student-b', ctxNormalExp1);
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'normal',
      null,
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    2,
  );

  // 4. Add remedial execution
  tracker.add('exec-3', 'student-a', ctxRemedialExp1);
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'remedial',
      'rem-abc',
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    1,
  );
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'normal',
      null,
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    2,
  );

  // 5. Add exercise execution
  tracker.add('exec-4', 'student-a', ctxNormalEx1);
  assert.equal(
    tracker.getRunningCount('kp-1', 'js-1', 'normal', null, 'exercise', 'ex-1'),
    1,
  );

  // 6. Remove one normal experiment execution
  tracker.remove('exec-1');
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'normal',
      null,
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    1,
  );

  // 7. Remove remaining executions
  tracker.remove('exec-2');
  tracker.remove('exec-3');
  tracker.remove('exec-4');
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'normal',
      null,
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    0,
  );
  assert.equal(
    tracker.getRunningCount(
      'kp-1',
      'js-1',
      'remedial',
      'rem-abc',
      'experiment',
      'exp-1',
      'exp-1:step:1',
    ),
    0,
  );
  assert.equal(
    tracker.getRunningCount('kp-1', 'js-1', 'normal', null, 'exercise', 'ex-1'),
    0,
  );
});
