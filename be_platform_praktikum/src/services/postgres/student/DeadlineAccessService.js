const pool = require('..');

const ACADEMIC_TIMEZONE = 'Asia/Jakarta';
const PROGRESS_DEADLINE_MESSAGE = 'Deadline pengerjaan telah berakhir. Progress tidak dapat disimpan.';
const SUBMIT_DEADLINE_MESSAGE = 'Deadline pengerjaan telah berakhir. Jobsheet tidak dapat dikumpulkan secara manual.';
const DEADLINE_MESSAGE = 'Deadline pengerjaan telah berakhir.';

class DeadlineAccessService {
  constructor() {
    this._pool = pool;
  }

  async resolveAttemptAccess({
    studentId,
    jobsheetId,
    kelasPraktikumId,
    client = this._pool,
  }) {
    if (!kelasPraktikumId) {
      throw new Error('Konteks kelas praktikum tidak valid.');
    }

    const contextResult = await client.query(
      `SELECT
        kp.id AS id_kelas_praktikum,
        km.id AS id_kelas_mhs,
        jc.deadline,
        to_char(jc.deadline, 'YYYY-MM-DD HH24:MI:SS') AS deadline_text,
        CASE
          WHEN jc.deadline IS NULL THEN false
          ELSE (NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}') > jc.deadline
        END AS is_deadline_passed
       FROM jobsheet_classes jc
       JOIN kelas_praktikum kp ON kp.id = jc.id_kelas_praktikum
       JOIN kelas_semester ks
         ON ks.id_tahun_semester = kp.id_tahun_semester
        AND ks.id_semester = kp.id_semester
        AND ks.id_kelas = kp.id_kelas
       JOIN kelas_mhs km
         ON km.id_kelas_semester = ks.id
        AND km.id_mahasiswa = $1
        AND km.status = 'active'
       WHERE jc.jobsheet_id = $2
         AND jc.id_kelas_praktikum = $3
         AND jc.is_active = true
       LIMIT 1`,
      [studentId, jobsheetId, kelasPraktikumId],
    );

    if (!contextResult.rows.length) {
      const publishedResult = await client.query(
        `SELECT 1
         FROM jobsheet_classes
         WHERE jobsheet_id = $1
           AND id_kelas_praktikum = $2
           AND is_active = true
         LIMIT 1`,
        [jobsheetId, kelasPraktikumId],
      );

      if (!publishedResult.rows.length) {
        throw new Error('Konteks kelas praktikum tidak valid.');
      }
      throw new Error('Mahasiswa belum terdaftar pada kelas semester ini.');
    }

    const academicContext = contextResult.rows[0];

    const remedialResult = await client.query(
      `SELECT jr.id, jr.status, jr.start_at, jr.end_at
       FROM jobsheet_remedials jr
       JOIN jobsheet_remedial_students jrs ON jrs.remedial_id = jr.id
       WHERE jr.jobsheet_id = $1
         AND jr.id_kelas_praktikum = $2
         AND jrs.student_id = $3
         AND jr.status = 'open'
         AND (NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}') BETWEEN jr.start_at AND jr.end_at
       ORDER BY jr.created_at DESC
       LIMIT 1`,
      [jobsheetId, academicContext.id_kelas_praktikum, studentId],
    );

    if (remedialResult.rows.length) {
      const remedialId = remedialResult.rows[0].id;
      const attemptResult = await client.query(
        `SELECT COALESCE(
           (SELECT attempt_no
            FROM task_submissions
            WHERE student_id = $1
              AND jobsheet_id = $2
              AND id_kelas_praktikum = $3
              AND remedial_id = $4
            LIMIT 1),
           (SELECT COALESCE(MAX(attempt_no), 1) + 1
            FROM task_submissions
            WHERE student_id = $1
              AND jobsheet_id = $2
              AND id_kelas_praktikum = $3)
         ) AS attempt_no`,
        [studentId, jobsheetId, academicContext.id_kelas_praktikum, remedialId],
      );
      const attemptNo = Number(attemptResult.rows[0]?.attempt_no || 2);

      return {
        academicContext,
        accessMode: 'editable_remedial',
        canEdit: true,
        canSaveProgress: true,
        canSubmit: true,
        attemptType: 'remedial',
        attemptNo,
        attemptLabel: `Remedial ${Math.max(1, attemptNo - 1)}`,
        remedialId,
        remedialEndAt: remedialResult.rows[0].end_at,
        isDeadlinePassed: Boolean(academicContext.is_deadline_passed),
      };
    }

    const isDeadlinePassed = Boolean(academicContext.is_deadline_passed);
    return {
      academicContext,
      accessMode: isDeadlinePassed ? 'locked_deadline' : 'editable_normal',
      canEdit: !isDeadlinePassed,
      canSaveProgress: !isDeadlinePassed,
      canSubmit: !isDeadlinePassed,
      attemptType: 'normal',
      attemptNo: 1,
      attemptLabel: undefined,
      remedialId: null,
      deadline: academicContext.deadline_text,
      isDeadlinePassed,
      message: isDeadlinePassed ? DEADLINE_MESSAGE : '',
    };
  }

  async assertCanSaveProgress(args) {
    const access = await this.resolveAttemptAccess(args);
    if (!access.canSaveProgress) {
      throw new Error(PROGRESS_DEADLINE_MESSAGE);
    }
    return access;
  }

  async assertCanSubmit(args) {
    const access = await this.resolveAttemptAccess(args);
    if (!access.canSubmit) {
      throw new Error(SUBMIT_DEADLINE_MESSAGE);
    }
    return access;
  }

  async assertCanWriteDraft(args) {
    const access = await this.resolveAttemptAccess(args);
    if (!access.canEdit) {
      throw new Error(PROGRESS_DEADLINE_MESSAGE);
    }
    return access;
  }
}

module.exports = new DeadlineAccessService();
module.exports.ACADEMIC_TIMEZONE = ACADEMIC_TIMEZONE;
module.exports.PROGRESS_DEADLINE_MESSAGE = PROGRESS_DEADLINE_MESSAGE;
module.exports.SUBMIT_DEADLINE_MESSAGE = SUBMIT_DEADLINE_MESSAGE;
