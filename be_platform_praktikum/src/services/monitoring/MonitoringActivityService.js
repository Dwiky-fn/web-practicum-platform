const pool = require('../postgres');
const MonitoringRealtimeHub = require('./MonitoringRealtimeHub');

function toIso(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function eventNameFromActivity(activityType = '') {
  const normalized = String(activityType || '').toLowerCase();
  if (normalized === 'code_run') return 'code-run';
  if (normalized.includes('open_experiment')) return 'experiment-opened';
  if (normalized.includes('open_instruction')) return 'instruction-opened';
  if (normalized.includes('save')) return 'work-saved';
  if (normalized.includes('complete')) return 'section-completed';
  if (normalized.includes('submit')) return 'submission-updated';
  return normalized || 'activity-updated';
}

class MonitoringActivityService {
  constructor(db = pool) {
    this._pool = db;
  }

  async buildEvent({
    kelasPraktikumId,
    studentId,
    jobsheetId,
    jobsheetClassId = null,
    experimentId = null,
    exerciseId = null,
    instructionId = null,
    activityType = 'activity-updated',
    lastActiveAt = new Date(),
    progressPercentage = null,
    submissionStatus = null,
  }) {
    const sectionType = exerciseId ? 'exercise' : experimentId ? 'experiment' : instructionId ? 'instruction' : null;
    const sectionId = exerciseId || experimentId || instructionId || null;

    const detailRes = await this._pool.query(
      `SELECT
         jc.id AS jobsheet_class_id,
         jc.urutan,
         j.title AS jobsheet_title,
         COALESCE(exp.title, ex.title, $6) AS section_name,
         COALESCE(run_counts.run_count, 0)::int AS run_count
       FROM jobsheet_classes jc
       JOIN jobsheets j ON j.id = jc.jobsheet_id
       LEFT JOIN experiments exp ON exp.id = $4
       LEFT JOIN exercises ex ON ex.id = COALESCE($5, $6)
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS run_count
         FROM student_jobsheet_activity_logs log
         WHERE log.student_id = $1
           AND log.id_kelas_praktikum = $2
           AND log.jobsheet_id = $3
           AND UPPER(log.activity_type) = 'CODE_RUN'
           AND COALESCE(log.experiment_id, '') = COALESCE($4, '')
           AND COALESCE(log.exercise_id, log.instruction_id, '') = COALESCE($5, $6, '')
       ) run_counts ON true
       WHERE jc.id_kelas_praktikum = $2
         AND jc.jobsheet_id = $3
       LIMIT 1`,
      [studentId, kelasPraktikumId, jobsheetId, experimentId, exerciseId, instructionId],
    );

    const detail = detailRes.rows[0] || {};

    return {
      type: 'student-monitoring-updated',
      eventVersion: 1,
      eventName: eventNameFromActivity(activityType),
      kelasPraktikumId,
      studentId,
      jobsheetId,
      jobsheetClassId: jobsheetClassId || detail.jobsheet_class_id || null,
      jobsheetName: detail.jobsheet_title || null,
      jobsheetSequence: detail.urutan == null ? null : Number(detail.urutan),
      sectionType,
      sectionId,
      sectionName: detail.section_name || null,
      lastActiveAt: toIso(lastActiveAt),
      runCount: Number(detail.run_count || 0),
      progressPercentage,
      submissionStatus,
    };
  }

  async broadcastActivity(payload) {
    if (!payload?.kelasPraktikumId || !payload?.studentId) return null;
    const event = await this.buildEvent(payload);
    MonitoringRealtimeHub.broadcastStudentActivity(event);
    return event;
  }
}

module.exports = new MonitoringActivityService();
module.exports._private = { eventNameFromActivity };
