exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Create departments table
  pgm.createTable('departments', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
      unique: true,
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

  // 2. Create study_programs table
  pgm.createTable('study_programs', {
    id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
    },
    department_id: {
      type: 'VARCHAR(20)',
      notNull: true,
      references: 'departments(id)',
      onDelete: 'RESTRICT',
    },
    name: {
      type: 'VARCHAR(100)',
      notNull: true,
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

  pgm.addConstraint('study_programs', 'study_programs_dept_name_unique', {
    unique: ['department_id', 'name'],
  });

  pgm.createIndex('study_programs', ['department_id']);

  // 3. Add study_program_id to student_profiles table
  pgm.addColumn('student_profiles', {
    study_program_id: {
      type: 'VARCHAR(20)',
      references: 'study_programs(id)',
      onDelete: 'SET NULL',
    },
  });

  // 4. Seed initial data
  pgm.sql(`
    INSERT INTO departments (id, name) VALUES
      ('dept-1', 'Teknik Sipil'),
      ('dept-2', 'Teknik Mesin'),
      ('dept-3', 'Teknik Elektro'),
      ('dept-4', 'Administrasi Bisnis'),
      ('dept-5', 'Akuntansi'),
      ('dept-6', 'Teknologi Pertanian'),
      ('dept-7', 'Ilmu Kelautan dan Perikanan'),
      ('dept-8', 'Teknik Arsitektur');

    INSERT INTO study_programs (id, department_id, name) VALUES
      -- Teknik Sipil
      ('prodi-1', 'dept-1', 'D3 Teknik Sipil'),
      ('prodi-2', 'dept-1', 'D4 Perencanaan Perumahan dan Pemukiman'),
      ('prodi-3', 'dept-1', 'D4 Teknologi Rekayasa Konstruksi Jalan dan Jembatan'),
      
      -- Teknik Mesin
      ('prodi-4', 'dept-2', 'D1 Operator dan Perawatan Alat Berat'),
      ('prodi-5', 'dept-2', 'D2 Pemeliharaan Kendaraan Ringan'),
      ('prodi-6', 'dept-2', 'D3 Teknik Mesin'),
      ('prodi-7', 'dept-2', 'D4 Teknik Mesin'),

      -- Teknik Elektro
      ('prodi-8', 'dept-3', 'D3 Teknik Informatika'),
      ('prodi-9', 'dept-3', 'D3 Teknik Listrik'),
      ('prodi-10', 'dept-3', 'D4 Teknologi Rekayasa Sistem Elektronika'),

      -- Administrasi Bisnis
      ('prodi-11', 'dept-4', 'D3 Administrasi Bisnis'),
      ('prodi-12', 'dept-4', 'D4 Administrasi Negara'),
      ('prodi-13', 'dept-4', 'D4 Administrasi Bisnis Otomotif'),
      ('prodi-14', 'dept-4', 'D4 Pengelolaan Usaha Rekreasi'),

      -- Akuntansi
      ('prodi-15', 'dept-5', 'D3 Akuntansi Keuangan'),
      ('prodi-16', 'dept-5', 'D4 Akuntansi Sektor Publik'),
      ('prodi-17', 'dept-5', 'D4 Perbankan dan Keuangan Digital'),
      ('prodi-18', 'dept-5', 'D4 Akuntansi Perpajakan'),

      -- Teknologi Pertanian
      ('prodi-19', 'dept-6', 'D4 Budidaya Tanaman Perkebunan'),
      ('prodi-20', 'dept-6', 'D4 Pengolahan Hasil Perkebunan Terpadu'),
      ('prodi-21', 'dept-6', 'D4 Manajemen Perkebunan'),

      -- Ilmu Kelautan dan Perikanan
      ('prodi-22', 'dept-7', 'D3 Budidaya Perikanan'),
      ('prodi-23', 'dept-7', 'D3 Teknologi Penangkapan Ikan'),
      ('prodi-24', 'dept-7', 'D4 Pengolahan dan Penyimpanan Hasil Perikanan'),

      -- Teknik Arsitektur
      ('prodi-25', 'dept-8', 'D4 Arsitektur Bangunan Gedung'),
      ('prodi-26', 'dept-8', 'D4 Desain Kawasan Binaan'),
      ('prodi-27', 'dept-8', 'D3 Arsitektur');
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('student_profiles', 'study_program_id');
  pgm.dropTable('study_programs', { cascade: true });
  pgm.dropTable('departments', { cascade: true });
};
