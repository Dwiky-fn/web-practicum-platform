exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('courses', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    name: {
      type: 'VARCHAR(255)',
      notNull: true,
    },
    code: {
      type: 'VARCHAR(50)',
      notNull: true,
      unique: true,
    },
    semester: {
      type: 'INT',
      notNull: true,
    },
    sks: {
      type: 'INT',
      notNull: true,
    },
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: 'AKTIF',
    },
    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  pgm.addConstraint(
    'courses',
    'courses_status_check',
    "CHECK (status IN ('AKTIF', 'NONAKTIF'))",
  );

  // Seed default course
  pgm.sql(`
    INSERT INTO courses (id, name, code, semester, sks, status, created_at)
    VALUES ('mk-3', 'Pemrograman Dasar', 'IF101', 1, 3, 'AKTIF', CURRENT_TIMESTAMP);
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('courses', { cascade: true });
};
