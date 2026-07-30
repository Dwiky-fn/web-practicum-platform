exports.shorthands = undefined;

exports.up = (pgm) => {
  // student_jobsheet_progress
  pgm.createTable('student_jobsheet_progress', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    student_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    class_id: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    module_id: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    jobsheet_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'jobsheets(id)',
      onDelete: 'CASCADE',
    },
    current_experiment_id: {
      type: 'VARCHAR(50)',
    },
    current_instruction_id: {
      type: 'VARCHAR(50)',
    },
    completed_steps: {
      type: 'INTEGER',
      default: 0,
    },
    total_steps: {
      type: 'INTEGER',
      default: 0,
    },
    progress_percentage: {
      type: 'NUMERIC(5,2)',
      default: 0,
    },
    status: {
      type: 'VARCHAR(30)',
      default: 'not_started',
    },
    first_opened_at: {
      type: 'TIMESTAMP',
    },
    last_activity_at: {
      type: 'TIMESTAMP',
    },
    completed_at: {
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
    'student_jobsheet_progress',
    'student_jobsheet_progress_status_check',
    "CHECK (status IN ('not_started', 'in_progress', 'stalled', 'completed'))",
  );

  pgm.addConstraint(
    'student_jobsheet_progress',
    'unique_student_jobsheet_progress',
    'UNIQUE(student_id, class_id, jobsheet_id)',
  );

  pgm.createIndex('student_jobsheet_progress', ['student_id']);
  pgm.createIndex('student_jobsheet_progress', ['class_id']);
  pgm.createIndex('student_jobsheet_progress', ['jobsheet_id']);

  // student_jobsheet_activity_logs
  pgm.createTable('student_jobsheet_activity_logs', {
    id: {
      type: 'VARCHAR(50)',
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
    experiment_id: {
      type: 'VARCHAR(50)',
    },
    instruction_id: {
      type: 'VARCHAR(50)',
    },
    activity_type: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    metadata: {
      type: 'JSONB',
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.createIndex('student_jobsheet_activity_logs', ['student_id']);
  pgm.createIndex('student_jobsheet_activity_logs', ['jobsheet_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('student_jobsheet_activity_logs', { cascade: true });
  pgm.dropTable('student_jobsheet_progress', { cascade: true });
};
