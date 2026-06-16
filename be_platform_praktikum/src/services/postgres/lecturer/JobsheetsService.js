const pool = require('..');
const { createId } = require('../admin/utils');

const emptyDoc = { type: 'doc', content: [] };

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractTextContent(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractTextContent).join('');
  return [node.text || '', ...(node.content || []).map(extractTextContent)].join('');
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
    }));
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
      rubric: Number(item.rubric) || 0,
    }));
  }

  _normalizeExercises(exercises = []) {
    return exercises.map((item) => ({
      id: item.id || createId('exe'),
      title: item.title || 'Latihan',
      instructionContent: item.instructionContent || emptyDoc,
      templateCode: item.templateCode || '',
      rubric: Number(item.rubric) || 0,
    }));
  }

  async _ensureCourseOwnedByLecturer(courseId, lecturerId, client = this._pool) {
    const result = await client.query(
      `
      SELECT 1
      FROM classes
      WHERE course_id = $1 AND lecturer_id = $2
      LIMIT 1
      `,
      [courseId, lecturerId],
    );

    if (!result.rows.length) {
      throw new Error('COURSE_ACCESS_DENIED');
    }
  }

  async _ensureJobsheetExists(courseId, jobsheetId, client = this._pool) {
    const result = await client.query(
      `
      SELECT *
      FROM jobsheets
      WHERE id = $1 AND course_id = $2
      LIMIT 1
      `,
      [jobsheetId, courseId],
    );

    if (!result.rows.length) {
      throw new Error('JOBSHEET_NOT_FOUND');
    }

    return result.rows[0];
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

  async createJobsheet(courseId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      await this._ensureCourseOwnedByLecturer(courseId, lecturerId, client);

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
      const editorMode = payload.editorMode || payload.editor_mode || 'mini_ide';

      await client.query(
        `
        INSERT INTO jobsheets (id, course_id, title, description, goal, content, status, programming_language, editor_mode)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          jobsheetId,
          courseId,
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

  async updateJobsheet(courseId, jobsheetId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      await this._ensureCourseOwnedByLecturer(courseId, lecturerId, client);
      const existing = await this._ensureJobsheetExists(courseId, jobsheetId, client);

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
      const editorMode = payload.editorMode || payload.editor_mode || existing.editor_mode || 'mini_ide';

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
        WHERE id = $1 AND course_id = $2
        `,
        [
          jobsheetId,
          courseId,
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

  async publishJobsheet(courseId, jobsheetId, lecturerId, payload) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');
      await this._ensureCourseOwnedByLecturer(courseId, lecturerId, client);
      const jobsheet = await this._ensureJobsheetExists(courseId, jobsheetId, client);
      const classes = Array.isArray(payload.classes) ? payload.classes : [];
      const allClassIds = classes.map((item) => item.classId);

      const ownedClasses = await client.query(
        `
        SELECT id, name
        FROM classes
        WHERE course_id = $1 AND lecturer_id = $2
        `,
        [courseId, lecturerId],
      );

      const ownedMap = new Map(ownedClasses.rows.map((item) => [item.id, item]));

      for (const item of classes) {
        if (!ownedMap.has(item.classId)) {
          throw new Error('CLASS_ACCESS_DENIED');
        }

        const isActive = item.isActive !== false;
        const status = isActive ? 'PUBLISHED' : 'UNPUBLISHED';

        await client.query(
          `
          INSERT INTO jobsheet_classes (
            id, jobsheet_id, class_id, is_active, deadline,
            title, description, goal, content, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (jobsheet_id, class_id)
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
            createId('jkc'),
            jobsheetId,
            item.classId,
            isActive,
            toIsoOrNull(item.deadline),
            jobsheet.title,
            jobsheet.description || '',
            jobsheet.goal || '',
            JSON.stringify(jobsheet.content || {}),
            status,
          ],
        );
      }

      if (ownedClasses.rows.length) {
        const classIdsToDisable = ownedClasses.rows
          .map((item) => item.id)
          .filter((id) => !allClassIds.includes(id));

        if (classIdsToDisable.length) {
          await client.query(
            `
            UPDATE jobsheet_classes
            SET is_active = false, status = 'UNPUBLISHED'
            WHERE jobsheet_id = $1 AND class_id = ANY($2)
            `,
            [jobsheetId, classIdsToDisable],
          );
        }
      }

      const activeCount = classes.filter((item) => item.isActive !== false).length;
      await client.query(
        `
        UPDATE jobsheets
        SET status = $2
        WHERE id = $1
        `,
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
}

module.exports = LecturerJobsheetsService;
