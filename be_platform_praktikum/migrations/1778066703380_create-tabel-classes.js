exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('classes', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    course_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'courses(id)',
      onDelete: 'CASCADE',
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },
    lecturer_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'users(id)',
      onDelete: 'RESTRICT',
    },
    academic_period_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'academic_periods(id)',
      onDelete: 'RESTRICT',
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'AKTIF',
    },
  });

  pgm.addConstraint(
    'classes',
    'classes_status_check',
    "CHECK (status IN ('AKTIF', 'NONAKTIF', 'SELESAI'))",
  );

  pgm.createIndex('classes', ['course_id']);
  pgm.createIndex('classes', ['lecturer_id']);
  pgm.createIndex('classes', ['academic_period_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('classes', { cascade: true });
};
