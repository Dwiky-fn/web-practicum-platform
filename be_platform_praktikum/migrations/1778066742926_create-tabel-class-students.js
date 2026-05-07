exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('class_students', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    class_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'classes(id)',
      onDelete: 'CASCADE',
    },
    student_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'AKTIF',
    },
  });

  pgm.addConstraint(
    'class_students',
    'unique_class_student',
    'UNIQUE(class_id, student_id)',
  );

  pgm.addConstraint(
    'class_students',
    'class_students_status_check',
    "CHECK (status IN ('AKTIF', 'NONAKTIF'))",
  );

  pgm.createIndex('class_students', ['class_id']);
  pgm.createIndex('class_students', ['student_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('class_students', { cascade: true });
};
