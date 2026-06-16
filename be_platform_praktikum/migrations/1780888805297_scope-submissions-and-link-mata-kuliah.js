exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('mata_kuliah', {
    legacy_course_id: {
      type: 'VARCHAR(20)',
      references: 'courses(id)',
      onDelete: 'SET NULL',
    },
  });
  pgm.createIndex('mata_kuliah', ['legacy_course_id']);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_mata_kuliah_legacy_course
    ON mata_kuliah (legacy_course_id)
    WHERE legacy_course_id IS NOT NULL
  `);

  pgm.addColumns('jobsheets', {
    id_mata_kuliah: {
      type: 'VARCHAR(20)',
      references: 'mata_kuliah(id)',
      onDelete: 'SET NULL',
    },
  });
  pgm.createIndex('jobsheets', ['id_mata_kuliah']);
  pgm.sql(`
    UPDATE jobsheets j
    SET id_mata_kuliah = mk.id
    FROM mata_kuliah mk
    WHERE mk.legacy_course_id = j.course_id
      AND j.id_mata_kuliah IS NULL
  `);

  pgm.dropConstraint('task_submissions', 'unique_jobsheet_student');
  pgm.sql(`
    CREATE UNIQUE INDEX unique_submission_without_kelas_praktikum
    ON task_submissions (jobsheet_id, student_id)
    WHERE id_kelas_praktikum IS NULL
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_submission_per_kelas_praktikum
    ON task_submissions (jobsheet_id, student_id, id_kelas_praktikum)
    WHERE id_kelas_praktikum IS NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS unique_submission_per_kelas_praktikum');
  pgm.sql('DROP INDEX IF EXISTS unique_submission_without_kelas_praktikum');
  pgm.addConstraint(
    'task_submissions',
    'unique_jobsheet_student',
    'UNIQUE(jobsheet_id, student_id)',
  );

  pgm.dropColumns('jobsheets', ['id_mata_kuliah'], { ifExists: true });
  pgm.sql('DROP INDEX IF EXISTS unique_mata_kuliah_legacy_course');
  pgm.dropColumns('mata_kuliah', ['legacy_course_id'], { ifExists: true });
};
