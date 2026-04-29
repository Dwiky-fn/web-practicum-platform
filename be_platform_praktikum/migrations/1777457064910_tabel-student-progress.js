exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createType('progress_status', ['BELUM', 'SEDANG', 'SELESAI']);

  pgm.createTable('student_progress', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },
    student_id: {
      type: 'VARCHAR(50)',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    jobsheet_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    class_id: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    status: {
      type: 'progress_status',
      notNull: true,
      default: 'BELUM',
    },
    progress: {
      type: 'FLOAT',
      notNull: true,
      default: 0,
    },
    last_page: {
      type: 'VARCHAR(255)',
      notNull: false,
    },
    last_activity: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint(
    'student_progress',
    'unique_student_jobsheet',
    'UNIQUE(student_id, jobsheet_id)',
  );

  pgm.createIndex('student_progress', ['student_id']);
  pgm.createIndex('student_progress', ['jobsheet_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('student_progress');
  pgm.dropType('progress_status');
};
