exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('academic_periods', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    year: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    semester_type: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    is_active: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
  });

  pgm.addConstraint(
    'academic_periods',
    'academic_periods_semester_type_check',
    "CHECK (semester_type IN ('GANJIL', 'GENAP'))",
  );
};

exports.down = (pgm) => {
  pgm.dropTable('academic_periods', { cascade: true });
};
