const pool = require('..');
const { AuthorizationError } = require('../../../exceptions');

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
    remedialId = null,
    attemptType = null,
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

    // Check for active remedial sessions for this student
    const activeRemedialRes = await client.query(
      `SELECT jr.id, jr.status, jr.start_at, jr.end_at,
              to_char(jr.start_at, 'YYYY-MM-DD HH24:MI:SS') AS start_at_text,
              to_char(jr.end_at, 'YYYY-MM-DD HH24:MI:SS') AS end_at_text
       FROM jobsheet_remedials jr
       JOIN jobsheet_remedial_students jrs ON jrs.remedial_id = jr.id
       WHERE jr.jobsheet_id = $1
         AND jr.id_kelas_praktikum = $2
         AND jrs.student_id = $3
         AND jr.status = 'open'
         AND (NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}') BETWEEN jr.start_at AND jr.end_at
       ORDER BY jr.created_at DESC
       LIMIT 1`,
      [jobsheetId, academicContext.id_kelas_praktikum, studentId]
    );

    let activeRemedial = activeRemedialRes.rows[0];
    let requestedRemedialId = remedialId || (attemptType === 'remedial' ? (activeRemedial?.id || 'unknown') : null);

    // If a remedial is explicitly requested or active, but the current active remedial does not match it
    if (requestedRemedialId && (!activeRemedial || activeRemedial.id !== requestedRemedialId)) {
      const specificRemedialRes = await client.query(
        `SELECT jr.id, jr.status, jr.start_at, jr.end_at,
                to_char(jr.start_at, 'YYYY-MM-DD HH24:MI:SS') AS start_at_text,
                to_char(jr.end_at, 'YYYY-MM-DD HH24:MI:SS') AS end_at_text,
                EXISTS(
                  SELECT 1 FROM jobsheet_remedial_students 
                  WHERE remedial_id = jr.id AND student_id = $2
                ) AS is_participant,
                CASE
                  WHEN jr.status = 'open' AND (NOW() AT TIME ZONE '${ACADEMIC_TIMEZONE}') BETWEEN jr.start_at AND jr.end_at THEN true
                  ELSE false
                END AS is_active
         FROM jobsheet_remedials jr
         WHERE jr.id = $1 AND jr.jobsheet_id = $3 AND jr.id_kelas_praktikum = $4`,
        [requestedRemedialId, studentId, jobsheetId, academicContext.id_kelas_praktikum]
      );

      if (!specificRemedialRes.rows.length) {
        return {
          academicContext,
          accessMode: 'locked_deadline',
          canEdit: false,
          canSaveProgress: false,
          canSubmit: false,
          attemptType: 'remedial',
          attemptNo: 2,
          remedialId: requestedRemedialId,
          message: 'Akses remedial tidak tersedia atau telah berakhir.',
          isDeadlinePassed: true,
        };
      }

      const specificRemedial = specificRemedialRes.rows[0];
      if (specificRemedial.status === 'cancelled') {
        return {
          academicContext,
          accessMode: 'locked_deadline',
          canEdit: false,
          canSaveProgress: false,
          canSubmit: false,
          attemptType: 'remedial',
          attemptNo: 2,
          remedialId: requestedRemedialId,
          message: 'Sesi remedial telah dibatalkan oleh dosen.',
          isDeadlinePassed: true,
        };
      }

      if (!specificRemedial.is_participant) {
        return {
          academicContext,
          accessMode: 'locked_deadline',
          canEdit: false,
          canSaveProgress: false,
          canSubmit: false,
          attemptType: 'remedial',
          attemptNo: 2,
          remedialId: requestedRemedialId,
          message: 'Anda tidak terdaftar sebagai peserta remedial untuk jobsheet ini.',
          isDeadlinePassed: true,
        };
      }

      return {
        academicContext,
        accessMode: 'locked_deadline',
        canEdit: false,
        canSaveProgress: false,
        canSubmit: false,
        attemptType: 'remedial',
        attemptNo: 2,
        remedialId: requestedRemedialId,
        message: 'Akses remedial tidak tersedia atau telah berakhir.',
        isDeadlinePassed: true,
      };
    }

    if (activeRemedial) {
      const remedialId = activeRemedial.id;
      const subResult = await client.query(
        `SELECT ts.id, ts.status, ts.attempt_no, ts.attempt_label, sr.decision
         FROM task_submissions ts
         LEFT JOIN LATERAL (
           SELECT decision FROM submission_reviews
           WHERE submission_id = ts.id
           ORDER BY id DESC
           LIMIT 1
         ) sr ON true
         WHERE ts.student_id = $1 AND ts.jobsheet_id = $2 AND ts.id_kelas_praktikum = $3 AND ts.remedial_id = $4
         LIMIT 1`,
        [studentId, jobsheetId, academicContext.id_kelas_praktikum, remedialId]
      );

      let attemptNo;
      if (subResult.rows.length) {
        attemptNo = Number(subResult.rows[0].attempt_no);
      } else {
        const maxAttemptResult = await client.query(
          `SELECT COALESCE(MAX(attempt_no), 1) + 1 AS next_attempt
           FROM task_submissions
           WHERE student_id = $1 AND jobsheet_id = $2 AND id_kelas_praktikum = $3`,
          [studentId, jobsheetId, academicContext.id_kelas_praktikum]
        );
        attemptNo = Number(maxAttemptResult.rows[0].next_attempt);
      }

      const attemptLabel = `Remedial ${Math.max(1, attemptNo - 1)}`;

      if (subResult.rows.length && subResult.rows[0].status === 'SUBMITTED') {
        const sub = subResult.rows[0];
        const isReviewed = sub.decision && sub.decision !== 'PENDING';
        return {
          academicContext,
          accessMode: isReviewed ? 'readonly_reviewed' : 'readonly_submitted',
          canEdit: false,
          canSaveProgress: false,
          canSubmit: false,
          attemptType: 'remedial',
          attemptNo,
          attemptLabel,
          remedialId,
          remedialEndAt: activeRemedial.end_at_text,
          isDeadlinePassed: Boolean(academicContext.is_deadline_passed),
        };
      }

      return {
        academicContext,
        accessMode: 'editable_remedial',
        canEdit: true,
        canSaveProgress: true,
        canSubmit: true,
        attemptType: 'remedial',
        attemptNo,
        attemptLabel,
        remedialId,
        remedialEndAt: activeRemedial.end_at_text,
        isDeadlinePassed: Boolean(academicContext.is_deadline_passed),
      };
    }

    const isDeadlinePassed = Boolean(academicContext.is_deadline_passed);

    // Get normal submission
    const normalSubResult = await client.query(
      `SELECT ts.id, ts.status, ts.attempt_no, ts.attempt_label, sr.decision
       FROM task_submissions ts
       LEFT JOIN LATERAL (
         SELECT decision FROM submission_reviews
         WHERE submission_id = ts.id
         ORDER BY id DESC
         LIMIT 1
       ) sr ON true
       WHERE ts.student_id = $1 AND ts.jobsheet_id = $2 AND ts.id_kelas_praktikum = $3 AND ts.remedial_id IS NULL
       LIMIT 1`,
      [studentId, jobsheetId, academicContext.id_kelas_praktikum]
    );

    if (normalSubResult.rows.length) {
      const sub = normalSubResult.rows[0];
      const attemptNo = Number(sub.attempt_no || 1);
      const attemptLabel = 'Pengerjaan Normal';

      if (sub.status === 'SUBMITTED') {
        const isReviewed = sub.decision && sub.decision !== 'PENDING';
        return {
          academicContext,
          accessMode: isReviewed ? 'readonly_reviewed' : 'readonly_submitted',
          canEdit: false,
          canSaveProgress: false,
          canSubmit: false,
          attemptType: 'normal',
          attemptNo,
          attemptLabel,
          remedialId: null,
          deadline: academicContext.deadline_text,
          isDeadlinePassed,
        };
      }

      return {
        academicContext,
        accessMode: isDeadlinePassed ? 'locked_deadline' : 'editable_normal',
        canEdit: !isDeadlinePassed,
        canSaveProgress: !isDeadlinePassed,
        canSubmit: !isDeadlinePassed,
        attemptType: 'normal',
        attemptNo,
        attemptLabel,
        remedialId: null,
        deadline: academicContext.deadline_text,
        isDeadlinePassed,
        message: isDeadlinePassed ? DEADLINE_MESSAGE : '',
      };
    }

    return {
      academicContext,
      accessMode: isDeadlinePassed ? 'locked_deadline' : 'editable_normal',
      canEdit: !isDeadlinePassed,
      canSaveProgress: !isDeadlinePassed,
      canSubmit: !isDeadlinePassed,
      attemptType: 'normal',
      attemptNo: 1,
      attemptLabel: 'Pengerjaan Normal',
      remedialId: null,
      deadline: academicContext.deadline_text,
      isDeadlinePassed,
      message: isDeadlinePassed ? DEADLINE_MESSAGE : '',
    };
  }

  async assertCanSaveProgress(args) {
    const access = await this.resolveAttemptAccess(args);
    if (!access.canSaveProgress) {
      throw new AuthorizationError(access.message || PROGRESS_DEADLINE_MESSAGE);
    }
    return access;
  }

  async assertCanSubmit(args) {
    const access = await this.resolveAttemptAccess(args);
    if (!access.canSubmit) {
      throw new AuthorizationError(access.message || SUBMIT_DEADLINE_MESSAGE);
    }
    return access;
  }

  async assertCanWriteDraft(args) {
    const access = await this.resolveAttemptAccess(args);
    if (!access.canEdit) {
      throw new AuthorizationError(access.message || PROGRESS_DEADLINE_MESSAGE);
    }
    return access;
  }
}

module.exports = new DeadlineAccessService();
module.exports.ACADEMIC_TIMEZONE = ACADEMIC_TIMEZONE;
module.exports.PROGRESS_DEADLINE_MESSAGE = PROGRESS_DEADLINE_MESSAGE;
module.exports.SUBMIT_DEADLINE_MESSAGE = SUBMIT_DEADLINE_MESSAGE;
