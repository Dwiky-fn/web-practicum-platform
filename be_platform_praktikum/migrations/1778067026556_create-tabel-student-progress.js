exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('student_progress', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    student_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    jobsheet_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'jobsheets(id)',
      onDelete: 'CASCADE',
    },
    class_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'classes(id)',
      onDelete: 'CASCADE',
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'BELUM',
    },
    progress: {
      type: 'FLOAT',
      notNull: true,
      default: 0,
    },
    last_page: {
      type: 'VARCHAR(21)',
    },
    last_activity: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    // Array of theory IDs that student has fully read.
    // Used as unlock gate: next theory section is locked
    // until current theory ID exists in this array.
    completed_theory_pages: {
      type: 'JSONB',
      notNull: true,
      default: pgm.func("'[]'::jsonb"),
    },
  });

  pgm.addConstraint(
    'student_progress',
    'student_progress_status_check',
    "CHECK (status IN ('BELUM', 'SEDANG', 'SELESAI'))",
  );

  pgm.addConstraint(
    'student_progress',
    'unique_student_jobsheet_class',
    'UNIQUE(student_id, jobsheet_id, class_id)',
  );

  pgm.createIndex('student_progress', ['student_id']);
  pgm.createIndex('student_progress', ['jobsheet_id']);
  pgm.createIndex('student_progress', ['class_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('student_progress', { cascade: true });
};
