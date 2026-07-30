exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Create admin_profiles table
  pgm.createTable('admin_profiles', {
    user_id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    study_program_id: {
      type: 'VARCHAR(20)',
      references: 'study_programs(id)',
      onDelete: 'SET NULL',
      default: 'prodi-8',
    },
    department_id: {
      type: 'VARCHAR(20)',
      references: 'departments(id)',
      onDelete: 'SET NULL',
      default: 'dept-3',
    },
    nip: {
      type: 'VARCHAR(50)',
    },
    no_telepon: {
      type: 'VARCHAR(20)',
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

  // 2. Add study_program_id column to mata_kuliah table
  pgm.addColumn('mata_kuliah', {
    study_program_id: {
      type: 'VARCHAR(20)',
      references: 'study_programs(id)',
      onDelete: 'RESTRICT',
      default: 'prodi-8',
    },
  });

  // 3. Populate admin_profiles for existing admin users with prodi-8
  pgm.sql(`
    INSERT INTO admin_profiles (user_id, study_program_id, department_id)
    SELECT id, 'prodi-8', 'dept-3' FROM users WHERE role = 'ADMIN'
    ON CONFLICT (user_id) DO NOTHING;

    UPDATE mata_kuliah SET study_program_id = 'prodi-8' WHERE study_program_id IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('mata_kuliah', 'study_program_id');
  pgm.dropTable('admin_profiles');
};
