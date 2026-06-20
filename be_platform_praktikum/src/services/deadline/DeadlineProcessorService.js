const pool = require('../postgres');
const { ACADEMIC_TIMEZONE } = require('../postgres/student/DeadlineAccessService');
const JobsheetProgressScoringService = require('../scoring/JobsheetProgressScoringService');

class DeadlineProcessorService {
  constructor() {
    this._pool = pool;
  }

  async getExpiredPublishedJobsheets(client = this._pool) {
    const result = await client.query(
      `SELECT
         jc.jobsheet_id,
         jc.id_kelas_praktikum,
         to_char(jc.deadline, 'YYYY-MM-DD HH24:MI:SS') AS deadline
       FROM jobsheet_classes jc
       WHERE jc.is_active = true
         AND jc.status = 'PUBLISHED'
         AND jc.deadline IS NOT NULL
         AND (NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}') > jc.deadline
       ORDER BY jc.deadline ASC`,
    );

    return result.rows;
  }

  async processJobsheetClass({ jobsheetId, kelasPraktikumId }, client) {
    const result = await client.query(
      `WITH enrolled AS (
         SELECT
           km.id_mahasiswa AS student_id,
           km.id AS id_kelas_mhs,
           kp.id AS id_kelas_praktikum,
           jc.jobsheet_id
         FROM jobsheet_classes jc
         JOIN kelas_praktikum kp ON kp.id = jc.id_kelas_praktikum
         JOIN kelas_semester ks
           ON ks.id_tahun_semester = kp.id_tahun_semester
          AND ks.id_semester = kp.id_semester
          AND ks.id_kelas = kp.id_kelas
         JOIN kelas_mhs km
           ON km.id_kelas_semester = ks.id
          AND km.status = 'active'
         WHERE jc.jobsheet_id = $1
           AND jc.id_kelas_praktikum = $2
           AND jc.is_active = true
           AND jc.status = 'PUBLISHED'
           AND jc.deadline IS NOT NULL
           AND (NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}') > jc.deadline
       ),
       snapshots AS (
         SELECT
           e.*,
           sp.progress AS student_progress,
           sp.last_page,
           COALESCE(sp.completed_items, '[]'::jsonb) AS completed_items,
           sjp.completed_steps,
           sjp.total_steps,
           sjp.progress_percentage,
           sjp.current_experiment_id,
           sjp.current_instruction_id,
           sjp.last_activity_at,
           COALESCE(logs.items, '[]'::jsonb) AS activity_logs
         FROM enrolled e
         LEFT JOIN LATERAL (
           SELECT *
           FROM student_progress
           WHERE student_id = e.student_id
             AND jobsheet_id = e.jobsheet_id
             AND id_kelas_praktikum = e.id_kelas_praktikum
             AND remedial_id IS NULL
           ORDER BY last_activity DESC NULLS LAST
           LIMIT 1
         ) sp ON true
         LEFT JOIN LATERAL (
           SELECT *
           FROM student_jobsheet_progress
           WHERE student_id = e.student_id
             AND jobsheet_id = e.jobsheet_id
             AND id_kelas_praktikum = e.id_kelas_praktikum
             AND remedial_id IS NULL
           ORDER BY last_activity_at DESC NULLS LAST
           LIMIT 1
         ) sjp ON true
         LEFT JOIN LATERAL (
           SELECT jsonb_agg(
             jsonb_build_object(
               'activityType', activity_type,
               'experimentId', experiment_id,
               'instructionId', instruction_id,
               'metadata', COALESCE(metadata, '{}'::jsonb),
               'createdAt', to_char(created_at, 'YYYY-MM-DD HH24:MI:SS')
             )
             ORDER BY created_at DESC
           ) AS items
           FROM (
             SELECT *
             FROM student_jobsheet_activity_logs
             WHERE student_id = e.student_id
               AND jobsheet_id = e.jobsheet_id
               AND remedial_id IS NULL
               AND activity_type NOT IN ('workspace_opened', 'workspace_closed')
             ORDER BY created_at DESC
             LIMIT 30
           ) recent_logs
         ) logs ON true
       ),
       prepared AS (
         SELECT
           CONCAT('subauto-', substr(md5(student_id || ':' || jobsheet_id || ':' || id_kelas_praktikum), 1, 12)) AS id,
           jobsheet_id,
           student_id,
           id_kelas_praktikum,
           id_kelas_mhs,
           jsonb_build_object(
             'autoSubmitted', true,
             'submissionSource', 'auto_deadline',
             'snapshotAt', to_char(NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}', 'YYYY-MM-DD HH24:MI:SS'),
             'studentProgress', student_progress,
             'lastPage', last_page,
             'completedItems', completed_items,
             'jobsheetProgress', jsonb_build_object(
               'completedSteps', COALESCE(completed_steps, 0),
               'totalSteps', COALESCE(total_steps, 0),
               'progressPercentage', COALESCE(progress_percentage, 0),
               'currentExperimentId', current_experiment_id,
               'currentInstructionId', current_instruction_id,
               'lastActivityAt', CASE
                 WHEN last_activity_at IS NULL THEN NULL
                 ELSE to_char(last_activity_at, 'YYYY-MM-DD HH24:MI:SS')
               END
             ),
             'activityLogs', activity_logs
           )::text AS report_html
         FROM snapshots
       )
       INSERT INTO task_submissions (
         id,
         jobsheet_id,
         student_id,
         id_kelas_praktikum,
         id_kelas_mhs,
         status,
         report_html,
         submitted_at,
         attempt_no,
         attempt_type,
         attempt_label,
         remedial_id,
         submission_source,
         is_auto_submitted,
         auto_submitted_at
       )
       SELECT
         id,
         jobsheet_id,
         student_id,
         id_kelas_praktikum,
         id_kelas_mhs,
         'SUBMITTED',
         report_html,
         NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}',
         1,
         'normal',
         'Pengerjaan Normal',
         NULL,
         'auto_deadline',
         true,
         NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}'
       FROM prepared
       ON CONFLICT (student_id, jobsheet_id, id_kelas_praktikum) WHERE (remedial_id IS NULL)
       DO UPDATE SET
         id_kelas_mhs = EXCLUDED.id_kelas_mhs,
         status = 'SUBMITTED',
         submitted_at = COALESCE(task_submissions.submitted_at, EXCLUDED.submitted_at),
         report_html = COALESCE(NULLIF(task_submissions.report_html, ''), EXCLUDED.report_html),
         submission_source = 'auto_deadline',
         is_auto_submitted = true,
         auto_submitted_at = COALESCE(task_submissions.auto_submitted_at, EXCLUDED.auto_submitted_at)
       WHERE task_submissions.status NOT IN ('SUBMITTED', 'REVIEWED')
         AND task_submissions.remedial_id IS NULL
       RETURNING id, student_id, id_kelas_mhs, status, (xmax = '0'::xid) AS inserted`,
      [jobsheetId, kelasPraktikumId],
    );

    const missingSnapshotResult = await client.query(
      `SELECT id, student_id, id_kelas_mhs, status, false AS inserted
       FROM task_submissions
       WHERE jobsheet_id = $1
         AND id_kelas_praktikum = $2
         AND remedial_id IS NULL
         AND submission_source = 'auto_deadline'
         AND status <> 'REVIEWED'
         AND calculated_progress_score IS NULL`,
      [jobsheetId, kelasPraktikumId],
    );

    const rowsForScoring = Array.from(
      [...result.rows, ...missingSnapshotResult.rows]
        .reduce((map, row) => map.set(row.id, row), new Map())
        .values(),
    );
    for (const row of rowsForScoring) {
      const scoreSnapshot = await JobsheetProgressScoringService.calculate({
        studentId: row.student_id,
        jobsheetId,
        kelasPraktikumId,
        idKelasMhs: row.id_kelas_mhs,
        attemptType: 'normal',
        attemptNo: 1,
        remedialId: null,
        client,
      });

      await client.query(
        `UPDATE task_submissions
         SET calculated_progress_score = $2,
             score_breakdown = $3::jsonb
         WHERE id = $1
           AND status <> 'REVIEWED'`,
        [row.id, scoreSnapshot.progressScore, JSON.stringify(scoreSnapshot)],
      );
    }

    return {
      created: result.rows.filter((row) => row.inserted).length,
      updated: result.rows.filter((row) => !row.inserted).length,
      touched: result.rows.length,
      scored: rowsForScoring.length,
    };
  }

  async processExpiredDeadlines() {
    const client = await this._pool.connect();
    const summary = {
      jobsheetClasses: 0,
      created: 0,
      updated: 0,
      touched: 0,
      scored: 0,
    };

    try {
      await client.query('BEGIN');
      const jobsheetClasses = await this.getExpiredPublishedJobsheets(client);
      summary.jobsheetClasses = jobsheetClasses.length;

      for (const item of jobsheetClasses) {
        const result = await this.processJobsheetClass(
          {
            jobsheetId: item.jobsheet_id,
            kelasPraktikumId: item.id_kelas_praktikum,
          },
          client,
        );
        summary.created += result.created;
        summary.updated += result.updated;
        summary.touched += result.touched;
        summary.scored += result.scored || 0;
      }

      await client.query('COMMIT');
      return summary;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new DeadlineProcessorService();
