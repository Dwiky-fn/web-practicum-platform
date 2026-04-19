exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('task_submission', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    student_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    report: {
      type: 'JSONB',
      notNull: true,
    },
    submitted_at: {
      type: 'TIMESTAMP',
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    updated_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint(
    'task_submission',
    'unique_jobsheet_student',
    'UNIQUE(jobsheet_id, student_id)',
  );

  pgm.createIndex('task_submission', ['jobsheet_id', 'student_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('task_submission');
};
