class RunningExecutionsTracker {
  constructor() {
    this._running = new Map();
  }

  add(executionId, studentId, context) {
    this._running.set(executionId, {
      studentId,
      context: context || {},
      startedAt: new Date(),
    });
  }

  remove(executionId) {
    return this._running.delete(executionId);
  }

  getRunningCount(
    kelasPraktikumId,
    jobsheetId,
    attemptType,
    remedialId,
    moduleType,
    moduleId,
    stepId = null,
  ) {
    let count = 0;
    const targetAttemptType = attemptType || 'normal';
    const targetRemedialId = remedialId || null;

    for (const item of this._running.values()) {
      const ctx = item.context || {};
      const ctxAttemptType = ctx.attemptType || 'normal';
      const ctxRemedialId = ctx.remedialId || null;

      const matchKP = !kelasPraktikumId || String(ctx.kelasPraktikumId || '') === String(kelasPraktikumId || '');
      const matchJobsheet = !jobsheetId || String(ctx.jobsheetId || '') === String(jobsheetId || '');
      const matchAttempt = String(ctxAttemptType) === String(targetAttemptType);
      const matchRemedial = String(ctxRemedialId || '') === String(targetRemedialId || '');

      if (matchKP && matchJobsheet && matchAttempt && matchRemedial) {
        if (moduleType) {
          const ctxModuleType = String(ctx.moduleType || '');
          if (ctxModuleType === String(moduleType)) {
            if (moduleType === 'experiment') {
              const matchExp = String(ctx.experimentId || '') === String(moduleId || '');
              const matchStep = !stepId || !ctx.instructionId || String(ctx.instructionId || '') === String(stepId || '');
              if (matchExp && matchStep) {
                count++;
              }
            } else if (moduleType === 'exercise') {
              if (String(ctx.exerciseId || '') === String(moduleId || '')) {
                count++;
              }
            } else if (moduleType === 'theory') {
              if (String(ctx.instructionId || '') === String(moduleId || '')) {
                count++;
              }
            }
          }
        } else {
          count++;
        }
      }
    }
    return count;
  }

  getTotalRunningCount(kelasPraktikumId = null, jobsheetId = null, attemptType = 'normal', remedialId = null) {
    return this.getRunningCount(kelasPraktikumId, jobsheetId, attemptType, remedialId, null, null, null);
  }
}

module.exports = new RunningExecutionsTracker();
