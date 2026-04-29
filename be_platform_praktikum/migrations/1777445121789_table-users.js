exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('users', {
    id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
    },

    full_name: {
      type: 'VARCHAR(100)',
      notNull: true,
    },

    email: {
      type: 'VARCHAR(100)',
      notNull: true,
      unique: true,
    },

    password: {
      type: 'VARCHAR(255)',
      notNull: true,
    },

    role: {
      type: 'VARCHAR(20)',
      notNull: true,
    },

    is_active: {
      type: 'BOOLEAN',
      notNull: true,
      default: true,
    },

    created_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
  });

  // 🔒 constraint role enum
  pgm.addConstraint(
    'users',
    'users_role_check',
    "CHECK (role IN ('MAHASISWA', 'DOSEN', 'ADMIN'))",
  );

  // 🚀 index tambahan
  pgm.createIndex('users', ['email']);
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};
