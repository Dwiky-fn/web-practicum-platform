const pool = require('..');
const { createId } = require('../admin/utils');
const { AuthorizationError, NotFoundError, ClientError } = require('../../../exceptions');

const emptyDoc = { type: 'doc', content: [] };

function normalizeLocalDeadline(value) {
  if (!value) return null;

  const normalized = String(value).trim().replace('T', ' ');
  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;

  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(withSeconds)) {
    throw new Error('Format deadline tidak valid');
  }

  return withSeconds;
}

function extractTextContent(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  return [node.text || '', ...(node.content || []).map(extractTextContent)].join('');
}

function normalizeRubric(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Number(number.toFixed(2));
}

function isValidRubric(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) return false;
  return Math.abs(number * 100 - Math.round(number * 100)) < 0.0001;
}

class LecturerJobsheetsService {
  constructor() {
    this._pool = pool;
  }

  _normalizeTheory(theory = []) {
    return theory.map((item, index) => ({
      id: item.id || createId('teori'),
      order: index + 1,
      title: item.title || `Subtopik ${index + 1}`,
      content: item.content || emptyDoc,
      rubric: normalizeRubric(item.rubric),
    }));
  }

  async _getAssessmentItems(client, jobsheetId, content = {}) {
    const theoryItems = Array.isArray(content.theory) ? content.theory : [];
    const experiments = await client.query(
      'SELECT id, title, rubric FROM experiments WHERE jobsheet_id = $1 ORDER BY id ASC',
      [jobsheetId],
    );
    const exercises = await client.query(
      'SELECT id, title, rubric FROM exercises WHERE jobsheet_id = $1 ORDER BY id ASC',
      [jobsheetId],
    );

    return [
      ...theoryItems.map((item, index) => ({
        id: item.id || `theory-${index}`,
        type: 'theory',
        title: item.title || `Subtopik ${index + 1}`,
        weight: normalizeRubric(item.rubric),
      })),
      ...experiments.rows.map((item, index) => ({
        id: item.id,
        type: 'experiment',
        title: item.title || `Percobaan ${index + 1}`,
        weight: normalizeRubric(item.rubric),
      })),
      ...exercises.rows.map((item, index) => ({
        id: item.id,
        type: 'exercise',
        title: item.title || `Latihan ${index + 1}`,
        weight: normalizeRubric(item.rubric),
      })),
    ];
  }

  async _assertPublishableJobsheet(client, jobsheet) {
    const items = await this._getAssessmentItems(client, jobsheet.id, jobsheet.content || {});

    if (!items.length) {
      throw new Error('Tambahkan minimal satu dasar teori, percobaan, atau latihan sebelum publish.');
    }

    if (items.some((item) => !isValidRubric(item.weight))) {
      throw new Error('Semua bobot harus berada pada rentang 0 sampai 100 dan maksimal 2 angka desimal.');
    }

    const totalHundredths = items.reduce((total, item) => total + Math.round(item.weight * 100), 0);
    if (totalHundredths !== 10000) {
      throw new Error('Total bobot seluruh Dasar Teori, Percobaan, dan Latihan harus tepat 100%.');
    }
  }

  async _deleteJobsheetDraft(client, jobsheetId) {
    const used = await client.query(
      "SELECT COUNT(*)::int AS total FROM jobsheet_classes WHERE jobsheet_id = $1 AND status = 'PUBLISHED'",
      [jobsheetId],
    );

    if (used.rows[0].total > 0) {
      throw new ClientError('Jobsheet tidak dapat dihapus karena sudah digunakan di kelas.', 409);
    }

    await client.query('DELETE FROM experiments WHERE jobsheet_id = $1', [jobsheetId]);
    await client.query('DELETE FROM exercises WHERE jobsheet_id = $1', [jobsheetId]);
    const deleted = await client.query(
      'DELETE FROM jobsheets WHERE id = $1 RETURNING id',
      [jobsheetId],
    );

    if (!deleted.rows.length) {
      throw new NotFoundError('Jobsheet tidak ditemukan.');
    }

    return deleted.rows[0];
  }

  _normalizeReportableItems(items = [], availableIds = []) {
    const byId = new Map(items.map((item) => [item.id, Boolean(item.isReported)]));
    return availableIds.map((id) => ({
      id,
      isReported: byId.get(id) ?? false,
    }));
  }

  _buildContent(payload, experimentIds, exerciseIds) {
    const task = payload.task || {};
    const experimentItems = this._normalizeReportableItems(
      task.experimentItems,
      experimentIds,
    );
    const exerciseItems = this._normalizeReportableItems(
      task.exerciseItems,
      exerciseIds,
    );

    return {
      summary: payload.summary || emptyDoc,
      theory: this._normalizeTheory(payload.theory),
      task: {
        experimentIds: experimentItems
          .filter((item) => item.isReported)
          .map((item) => item.id),
        exerciseIds: exerciseItems
          .filter((item) => item.isReported)
          .map((item) => item.id),
        experimentItems,
        exerciseItems,
        instructionContent: task.instructionContent || emptyDoc,
        additionalNoteContent: task.additionalNoteContent || emptyDoc,
        requireSelfDeclaration: Boolean(task.requireSelfDeclaration),
        conclusionConfig: task.conclusionConfig || {
          enabled: true,
          required: false,
        },
      },
    };
  }

  _normalizeExperiments(experiments = []) {
    return experiments.map((item) => ({
      id: item.id || createId('exp'),
      title: item.title || 'Percobaan',
      instructionContent: item.instructionContent || emptyDoc,
      templateCode: item.templateCode || '',
      rubric: normalizeRubric(item.rubric),
    }));
  }

  _normalizeExercises(exercises = []) {
    return exercises.map((item) => ({
      id: item.id || createId('exe'),
      title: item.title || 'Latihan',
      instructionContent: item.instructionContent || emptyDoc,
      templateCode: item.templateCode || '',
      rubric: normalizeRubric(item.rubric),
    }));
  }

  async _ensureKelasPraktikumOwnedByLecturer(kelasPraktikumId, lecturerId, client = this._pool) {
    const result = await client.query(
      `
      SELECT
        kp.id,
        kp.id_mata_kuliah,
        kp.id_tahun_semester,
        kp.id_semester,
        kp.id_kelas
      FROM kelas_praktikum kp
      JOIN pengampu p ON p.id_kelas_praktikum = kp.id
      WHERE kp.id = $1
        AND p.id_dosen = $2
      LIMIT 1
      `,
      [kelasPraktikumId, lecturerId],
    );

    if (!result.rows.length) {
      throw new Error('Anda tidak memiliki akses ke kelas praktikum ini.');
    }

    return result.rows[0];
  }

  async _ensureJobsheetExistsByMataKuliah(mataKuliahId, jobsheetId, client = this._pool) {
    const result = await client.query(
      `
      SELECT *
      FROM jobsheets
      WHERE id = $1 AND id_mata_kuliah = $2
      LIMIT 1
      `,
      [jobsheetId, mataKuliahId],
    );

    if (!result.rows.length) {
      throw new Error('JOBSHEET_NOT_FOUND');
    }

    return result.rows[0];
  }

  async _ensureMataKuliahOwnedByLecturer(mataKuliahId, lecturerId, client = this._pool) {
    const result = await client.query(
      `
      SELECT mk.id
      FROM mata_kuliah mk
      WHERE mk.id = $1
        AND EXISTS (
          SELECT 1
          FROM kelas_praktikum kp
          JOIN pengampu p ON p.id_kelas_praktikum = kp.id
          WHERE kp.id_mata_kuliah = mk.id
            AND p.id_dosen = $2
        )
      LIMIT 1
      `,
      [mataKuliahId, lecturerId],
    );

    if (!result.rows.length) {
      throw new Error('COURSE_ACCESS_DENIED');
    }

    return result.rows[0];
  }

  async _upsertJobsheetClassCopy(client, payload) {
    await client.query(
      `
      INSERT INTO jobsheet_classes (
        id, jobsheet_id, id_kelas_praktikum, is_active, deadline,
        title, description, goal, content, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (jobsheet_id, id_kelas_praktikum)
      WHERE id_kelas_praktikum IS NOT NULL
      DO UPDATE SET
        is_active = EXCLUDED.is_active,
        deadline = EXCLUDED.deadline,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        goal = EXCLUDED.goal,
        content = EXCLUDED.content,
        status = EXCLUDED.status
      `,
      [
        payload.id,
        payload.jobsheetId,
        payload.kelasPraktikumId,
        payload.isActive,
        payload.deadline,
        payload.title,
        payload.description || '',
        payload.goal || '',
        JSON.stringify(payload.content || {}),
        payload.status,
      ],
    );
  }

  async _syncExperiments(client, jobsheetId, experiments) {
    await client.query('DELETE FROM experiments WHERE jobsheet_id = $1', [jobsheetId]);

    for (const experiment of experiments) {
      await client.query(
        `
        INSERT INTO experiments (id, jobsheet_id, title, instruction_content, template_code, rubric)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          experiment.id,
          jobsheetId,
          experiment.title,
          JSON.stringify(experiment.instructionContent || emptyDoc),
          experiment.templateCode || '',
          experiment.rubric,
        ],
      );
    }
  }

  async _syncExercises(client, jobsheetId, exercises) {
    await client.query('DELETE FROM exercises WHERE jobsheet_id = $1', [jobsheetId]);

    for (const exercise of exercises) {
      await client.query(
        `
        INSERT INTO exercises (id, jobsheet_id, title, instruction_content, template_code, rubric)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          exercise.id,
          jobsheetId,
          exercise.title,
          JSON.stringify(exercise.instructionContent || emptyDoc),
          exercise.templateCode || '',
          exercise.rubric,
        ],
      );
    }
  }

  async _refreshPublishedClassCopies(client, jobsheetId, title, description, goal, content) {
    await client.query(
      `
      UPDATE jobsheet_classes
      SET
        title = $2,
        description = $3,
        goal = $4,
        content = $5
      WHERE jobsheet_id = $1
      `,
      [jobsheetId, title, description, goal, JSON.stringify(content)],
    );
  }

  async createJobsheetByKelasPraktikum(kelasPraktikumId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      const kelasPraktikum = await this._ensureKelasPraktikumOwnedByLecturer(kelasPraktikumId, lecturerId, client);
      const mataKuliahId = kelasPraktikum.id_mata_kuliah;

      const jobsheetId = payload.id || createId('job');
      const experiments = this._normalizeExperiments(payload.experiments);
      const exercises = this._normalizeExercises(payload.exercises);
      const content = this._buildContent(
        payload,
        experiments.map((item) => item.id),
        exercises.map((item) => item.id),
      );
      const isDraft = payload.status === 'draft';
      const title = !payload.title?.trim()
        ? (isDraft ? 'Draft Tanpa Judul' : 'Jobsheet Baru')
        : payload.title.trim();
      const description = payload.description || '';
      const goal = payload.goal || extractTextContent(payload.goalContent);

      const programmingLanguage = payload.programmingLanguage || payload.programming_language || 'java';
      const editorMode = 'mini_ide';

      await client.query(
        `
        INSERT INTO jobsheets (id, id_mata_kuliah, title, description, goal, content, status, programming_language, editor_mode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          jobsheetId,
          mataKuliahId,
          title,
          description,
          goal,
          JSON.stringify(content),
          'DRAFT',
          programmingLanguage,
          editorMode,
        ],
      );

      await this._syncExperiments(client, jobsheetId, experiments);
      await this._syncExercises(client, jobsheetId, exercises);
      await client.query('COMMIT');

      return { id: jobsheetId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateJobsheetByKelasPraktikum(kelasPraktikumId, jobsheetId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      const kelasPraktikum = await this._ensureKelasPraktikumOwnedByLecturer(kelasPraktikumId, lecturerId, client);
      const mataKuliahId = kelasPraktikum.id_mata_kuliah;
      const existing = await this._ensureJobsheetExistsByMataKuliah(mataKuliahId, jobsheetId, client);

      const experiments = this._normalizeExperiments(payload.experiments);
      const exercises = this._normalizeExercises(payload.exercises);
      const content = this._buildContent(
        payload,
        experiments.map((item) => item.id),
        exercises.map((item) => item.id),
      );
      const isDraft = payload.status === 'draft' || existing.status === 'DRAFT';
      const title = !payload.title?.trim()
        ? (isDraft ? 'Draft Tanpa Judul' : existing.title)
        : payload.title.trim();
      const description = payload.description || '';
      const goal = payload.goal || extractTextContent(payload.goalContent);

      const programmingLanguage = payload.programmingLanguage || payload.programming_language || existing.programming_language || 'java';
      const editorMode = 'mini_ide';

      await client.query(
        `
        UPDATE jobsheets
        SET
          title = $3,
          description = $4,
          goal = $5,
          content = $6,
          programming_language = $7,
          editor_mode = $8
        WHERE id = $1 AND id_mata_kuliah = $2
        `,
        [
          jobsheetId,
          mataKuliahId,
          title,
          description,
          goal,
          JSON.stringify(content),
          programmingLanguage,
          editorMode,
        ],
      );

      await this._syncExperiments(client, jobsheetId, experiments);
      await this._syncExercises(client, jobsheetId, exercises);
      await this._refreshPublishedClassCopies(
        client,
        jobsheetId,
        title,
        description,
        goal,
        content,
      );

      await client.query('COMMIT');
      return { id: jobsheetId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async createJobsheet(courseId, lecturerId, payload) {
    return this.createJobsheetByMataKuliah(courseId, lecturerId, payload);
  }

  async updateJobsheet(courseId, jobsheetId, lecturerId, payload) {
    return this.updateJobsheetByMataKuliah(courseId, jobsheetId, lecturerId, payload);
  }

  async createJobsheetByMataKuliah(mataKuliahId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      const mataKuliah = await this._ensureMataKuliahOwnedByLecturer(mataKuliahId, lecturerId, client);

      const jobsheetId = payload.id || createId('job');
      const experiments = this._normalizeExperiments(payload.experiments);
      const exercises = this._normalizeExercises(payload.exercises);
      const content = this._buildContent(
        payload,
        experiments.map((item) => item.id),
        exercises.map((item) => item.id),
      );
      const isDraft = payload.status === 'draft';
      const title = !payload.title?.trim()
        ? (isDraft ? 'Draft Tanpa Judul' : 'Jobsheet Baru')
        : payload.title.trim();
      const description = payload.description || '';
      const goal = payload.goal || extractTextContent(payload.goalContent);
      const programmingLanguage = payload.programmingLanguage || payload.programming_language || 'java';
      const editorMode = 'mini_ide';

      await client.query(
        `
        INSERT INTO jobsheets (id, id_mata_kuliah, title, description, goal, content, status, programming_language, editor_mode)
        VALUES ($1, $2, $3, $4, $5, $6, 'DRAFT', $7, $8)
        `,
        [
          jobsheetId,
          mataKuliahId,
          title,
          description,
          goal,
          JSON.stringify(content),
          programmingLanguage,
          editorMode,
        ],
      );

      await this._syncExperiments(client, jobsheetId, experiments);
      await this._syncExercises(client, jobsheetId, exercises);
      await client.query('COMMIT');

      return { id: jobsheetId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateJobsheetByMataKuliah(mataKuliahId, jobsheetId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      await this._ensureMataKuliahOwnedByLecturer(mataKuliahId, lecturerId, client);
      const existing = await this._ensureJobsheetExistsByMataKuliah(mataKuliahId, jobsheetId, client);

      const experiments = this._normalizeExperiments(payload.experiments);
      const exercises = this._normalizeExercises(payload.exercises);
      const content = this._buildContent(
        payload,
        experiments.map((item) => item.id),
        exercises.map((item) => item.id),
      );
      const isDraft = payload.status === 'draft' || existing.status === 'DRAFT';
      const title = !payload.title?.trim()
        ? (isDraft ? 'Draft Tanpa Judul' : existing.title)
        : payload.title.trim();
      const description = payload.description || '';
      const goal = payload.goal || extractTextContent(payload.goalContent);
      const programmingLanguage = payload.programmingLanguage || payload.programming_language || existing.programming_language || 'java';
      const editorMode = 'mini_ide';

      await client.query(
        `
        UPDATE jobsheets
        SET title = $3,
            description = $4,
            goal = $5,
            content = $6,
            programming_language = $7,
            editor_mode = $8
        WHERE id = $1 AND id_mata_kuliah = $2
        `,
        [
          jobsheetId,
          mataKuliahId,
          title,
          description,
          goal,
          JSON.stringify(content),
          programmingLanguage,
          editorMode,
        ],
      );

      await this._syncExperiments(client, jobsheetId, experiments);
      await this._syncExercises(client, jobsheetId, exercises);
      await this._refreshPublishedClassCopies(client, jobsheetId, title, description, goal, content);

      await client.query('COMMIT');
      return { id: jobsheetId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async publishJobsheetByMataKuliah(mataKuliahId, jobsheetId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      await this._ensureMataKuliahOwnedByLecturer(mataKuliahId, lecturerId, client);
      const jobsheet = await this._ensureJobsheetExistsByMataKuliah(mataKuliahId, jobsheetId, client);
      await this._assertPublishableJobsheet(client, jobsheet);
      const classes = Array.isArray(payload.classes) ? payload.classes : [];
      const requestedIds = classes
        // classId is a compatibility alias for kelasPraktikumId.
        .map((item) => item.kelasPraktikumId || item.id_kelas_praktikum || item.classId)
        .filter(Boolean);

      const owned = await client.query(
        `
        SELECT kp.id
        FROM kelas_praktikum kp
        JOIN pengampu p ON p.id_kelas_praktikum = kp.id
        WHERE kp.id_mata_kuliah = $1
          AND p.id_dosen = $2
        `,
        [mataKuliahId, lecturerId],
      );
      const ownedMap = new Map(owned.rows.map((item) => [item.id, item]));

      for (const item of classes) {
        // classId is a compatibility alias for kelasPraktikumId.
        const kelasPraktikumId = item.kelasPraktikumId || item.id_kelas_praktikum || item.classId;
        const kelasPraktikum = ownedMap.get(kelasPraktikumId);
        if (!kelasPraktikum) throw new Error('CLASS_ACCESS_DENIED');

        const isActive = item.isActive !== false;
        const status = isActive ? 'PUBLISHED' : 'UNPUBLISHED';

        await this._upsertJobsheetClassCopy(client, {
          id: createId('jkc'),
          jobsheetId,
          kelasPraktikumId,
          isActive,
          deadline: normalizeLocalDeadline(item.deadline),
          title: jobsheet.title,
          description: jobsheet.description || '',
          goal: jobsheet.goal || '',
          content: jobsheet.content || {},
          status,
        });
      }

      const disableIds = owned.rows
        .map((item) => item.id)
        .filter((id) => !requestedIds.includes(id));
      if (disableIds.length) {
        await client.query(
          `
          UPDATE jobsheet_classes
          SET is_active = false, status = 'UNPUBLISHED'
          WHERE jobsheet_id = $1 AND id_kelas_praktikum = ANY($2)
          `,
          [jobsheetId, disableIds],
        );
      }

      const activeCount = classes.filter((item) => item.isActive !== false).length;
      await client.query(
        'UPDATE jobsheets SET status = $2 WHERE id = $1',
        [jobsheetId, activeCount > 0 ? 'PUBLISHED' : 'UNPUBLISHED'],
      );

      await client.query('COMMIT');
      return { id: jobsheetId, status: activeCount > 0 ? 'PUBLISHED' : 'UNPUBLISHED' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async publishJobsheetByKelasPraktikum(kelasPraktikumId, jobsheetId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      const kelasPraktikum = await this._ensureKelasPraktikumOwnedByLecturer(kelasPraktikumId, lecturerId, client);
      const jobsheet = await this._ensureJobsheetExistsByMataKuliah(kelasPraktikum.id_mata_kuliah, jobsheetId, client);
      await this._assertPublishableJobsheet(client, jobsheet);
      const isActive = payload.isActive !== false;
      const status = isActive ? 'PUBLISHED' : 'UNPUBLISHED';

      await this._upsertJobsheetClassCopy(client, {
        id: createId('jkc'),
        jobsheetId,
        kelasPraktikumId,
        isActive,
        deadline: normalizeLocalDeadline(payload.deadline),
        title: jobsheet.title,
        description: jobsheet.description || '',
        goal: jobsheet.goal || '',
        content: jobsheet.content || {},
        status,
      });

      await client.query(
        `
        UPDATE jobsheets
        SET status = $2
        WHERE id = $1
        `,
        [jobsheetId, status],
      );

      await client.query('COMMIT');
      return { id: jobsheetId, status };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async publishJobsheet(courseId, jobsheetId, lecturerId, payload) {
    return this.publishJobsheetByMataKuliah(courseId, jobsheetId, lecturerId, payload);
  }

  async deleteJobsheetByMataKuliah(mataKuliahId, jobsheetId, lecturerId) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      
      // 1. Cek jobsheet ada
      const jobsheetRes = await client.query(
        'SELECT * FROM jobsheets WHERE id = $1',
        [jobsheetId],
      );
      if (!jobsheetRes.rows.length) {
        throw new NotFoundError('Jobsheet tidak ditemukan.');
      }
      const jobsheet = jobsheetRes.rows[0];

      // Verifikasi jobsheet terhubung ke mata kuliah ini
      if (jobsheet.id_mata_kuliah !== mataKuliahId) {
        throw new NotFoundError('Jobsheet tidak ditemukan.');
      }

      // 2. Cek dosen memiliki akses terhadap jobsheet
      const accessRes = await client.query(
        `
        SELECT 1
        FROM pengampu p
        JOIN kelas_praktikum kp ON p.id_kelas_praktikum = kp.id
        WHERE p.id_dosen = $1 AND kp.id_mata_kuliah = $2
        LIMIT 1
        `,
        [lecturerId, jobsheet.id_mata_kuliah],
      );
      if (!accessRes.rows.length) {
        throw new AuthorizationError('Anda tidak memiliki akses ke jobsheet ini.');
      }

      const deleted = await this._deleteJobsheetDraft(client, jobsheetId);
      await client.query('COMMIT');
      return deleted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteJobsheetByKelasPraktikum(kelasPraktikumId, jobsheetId, lecturerId) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Cek jobsheet ada
      const jobsheetRes = await client.query(
        'SELECT * FROM jobsheets WHERE id = $1',
        [jobsheetId],
      );
      if (!jobsheetRes.rows.length) {
        throw new NotFoundError('Jobsheet tidak ditemukan.');
      }
      const jobsheet = jobsheetRes.rows[0];

      // 2. Cek dosen memiliki akses ke kelas praktikum
      const classRes = await client.query(
        `
        SELECT kp.id_mata_kuliah
        FROM kelas_praktikum kp
        JOIN pengampu p ON p.id_kelas_praktikum = kp.id
        WHERE kp.id = $1 AND p.id_dosen = $2
        LIMIT 1
        `,
        [kelasPraktikumId, lecturerId],
      );
      if (!classRes.rows.length) {
        throw new AuthorizationError('Anda tidak memiliki akses ke jobsheet ini.');
      }
      const classMataKuliahId = classRes.rows[0].id_mata_kuliah;

      // Verifikasi jobsheet terhubung ke mata kuliah kelas praktikum ini
      if (jobsheet.id_mata_kuliah !== classMataKuliahId) {
        throw new NotFoundError('Jobsheet tidak ditemukan.');
      }

      const deleted = await this._deleteJobsheetDraft(client, jobsheetId);
      await client.query('COMMIT');
      return deleted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteJobsheet(courseId, jobsheetId, lecturerId) {
    return this.deleteJobsheetByMataKuliah(courseId, jobsheetId, lecturerId);
  }

  async checkJobsheetAccess(jobsheetId, lecturerId, client = this._pool) {
    const jobsheetRes = await client.query(
      'SELECT id, id_mata_kuliah FROM jobsheets WHERE id = $1',
      [jobsheetId],
    );

    if (!jobsheetRes.rows.length) {
      throw new NotFoundError('Jobsheet tidak ditemukan.');
    }

    const jobsheet = jobsheetRes.rows[0];

    const accessRes = await client.query(
      `
      SELECT 1
      FROM pengampu p
      JOIN kelas_praktikum kp ON p.id_kelas_praktikum = kp.id
      WHERE p.id_dosen = $1 AND kp.id_mata_kuliah = $2
      LIMIT 1
      `,
      [lecturerId, jobsheet.id_mata_kuliah],
    );

    if (!accessRes.rows.length) {
      throw new AuthorizationError('Anda tidak memiliki akses ke jobsheet ini.');
    }

    return jobsheet;
  }

  async saveJobsheetImage({ id, jobsheetId, uploadedBy, publicId, url, mimeType, fileSize, width, height }) {
    await this._pool.query(
      `
      INSERT INTO jobsheet_editor_images (
        id, jobsheet_id, uploaded_by, public_id, url, mime_type, file_size, width, height
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [id, jobsheetId, uploadedBy, publicId, url, mimeType, fileSize, width, height],
    );
  }

  async deleteJobsheetImage(imageId, jobsheetId, lecturerId) {
    await this.checkJobsheetAccess(jobsheetId, lecturerId);

    const imageRes = await this._pool.query(
      'SELECT * FROM jobsheet_editor_images WHERE id = $1 AND jobsheet_id = $2 AND deleted_at IS NULL',
      [imageId, jobsheetId],
    );

    if (!imageRes.rows.length) {
      throw new NotFoundError('Gambar tidak ditemukan.');
    }

    await this._pool.query(
      'UPDATE jobsheet_editor_images SET deleted_at = NOW() WHERE id = $1',
      [imageId],
    );
  }
}

module.exports = LecturerJobsheetsService;
