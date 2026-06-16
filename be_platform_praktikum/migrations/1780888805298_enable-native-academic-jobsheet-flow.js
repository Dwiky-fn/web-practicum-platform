exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.alterColumn('jobsheets', 'course_id', { notNull: false });

  pgm.dropConstraint('jobsheet_classes', 'unique_jobsheet_class');
  pgm.alterColumn('jobsheet_classes', 'class_id', { notNull: false });
  pgm.sql(`
    CREATE UNIQUE INDEX unique_jobsheet_class_legacy
    ON jobsheet_classes (jobsheet_id, class_id)
    WHERE class_id IS NOT NULL
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_jobsheet_kelas_praktikum
    ON jobsheet_classes (jobsheet_id, id_kelas_praktikum)
    WHERE id_kelas_praktikum IS NOT NULL
  `);

  pgm.dropConstraint('student_progress', 'unique_student_jobsheet_class');
  pgm.alterColumn('student_progress', 'class_id', { notNull: false });
  pgm.sql(`
    CREATE UNIQUE INDEX unique_student_jobsheet_class_legacy
    ON student_progress (student_id, jobsheet_id, class_id)
    WHERE class_id IS NOT NULL
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_student_jobsheet_kelas_praktikum
    ON student_progress (student_id, jobsheet_id, id_kelas_praktikum)
    WHERE id_kelas_praktikum IS NOT NULL
  `);

  pgm.dropConstraint('student_jobsheet_progress', 'unique_student_jobsheet_progress');
  pgm.alterColumn('student_jobsheet_progress', 'class_id', { notNull: false });
  pgm.sql(`
    CREATE UNIQUE INDEX unique_student_snapshot_class_legacy
    ON student_jobsheet_progress (student_id, class_id, jobsheet_id)
    WHERE class_id IS NOT NULL
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_student_snapshot_kelas_praktikum
    ON student_jobsheet_progress (student_id, id_kelas_praktikum, jobsheet_id)
    WHERE id_kelas_praktikum IS NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS unique_student_snapshot_kelas_praktikum');
  pgm.sql('DROP INDEX IF EXISTS unique_student_snapshot_class_legacy');
  pgm.alterColumn('student_jobsheet_progress', 'class_id', { notNull: true });
  pgm.addConstraint(
    'student_jobsheet_progress',
    'unique_student_jobsheet_progress',
    'UNIQUE(student_id, class_id, jobsheet_id)',
  );

  pgm.sql('DROP INDEX IF EXISTS unique_student_jobsheet_kelas_praktikum');
  pgm.sql('DROP INDEX IF EXISTS unique_student_jobsheet_class_legacy');
  pgm.alterColumn('student_progress', 'class_id', { notNull: true });
  pgm.addConstraint(
    'student_progress',
    'unique_student_jobsheet_class',
    'UNIQUE(student_id, jobsheet_id, class_id)',
  );

  pgm.sql('DROP INDEX IF EXISTS unique_jobsheet_kelas_praktikum');
  pgm.sql('DROP INDEX IF EXISTS unique_jobsheet_class_legacy');
  pgm.alterColumn('jobsheet_classes', 'class_id', { notNull: true });
  pgm.addConstraint(
    'jobsheet_classes',
    'unique_jobsheet_class',
    'UNIQUE(jobsheet_id, class_id)',
  );

  pgm.alterColumn('jobsheets', 'course_id', { notNull: true });
};
