exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('task_submissions', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'jobsheets(id)',
      onDelete: 'CASCADE',
    },
    student_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'DRAFT',
    },
    report_html: {
      type: 'TEXT',
    },
    submitted_at: {
      type: 'TIMESTAMP',
    },
  });

  pgm.addConstraint(
    'task_submissions',
    'unique_jobsheet_student',
    'UNIQUE(jobsheet_id, student_id)',
  );

  pgm.addConstraint(
    'task_submissions',
    'task_submissions_status_check',
    "CHECK (status IN ('DRAFT', 'SUBMITTED', 'REVIEWED'))",
  );

  pgm.createIndex('task_submissions', ['jobsheet_id']);
  pgm.createIndex('task_submissions', ['student_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('task_submissions', { cascade: true });
};
