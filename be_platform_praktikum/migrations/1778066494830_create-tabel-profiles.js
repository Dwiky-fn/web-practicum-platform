exports.shorthands = undefined;

exports.up = (pgm) => {
  // STUDENT_PROFILES
  pgm.createTable('student_profiles', {
    user_id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    nim: {
      type: 'VARCHAR(20)',
      notNull: true,
      unique: true,
    },
    program_studi: {
      type: 'VARCHAR(100)',
    },
    jurusan: {
      type: 'VARCHAR(100)',
    },
    angkatan: {
      type: 'INT',
    },
    semester: {
      type: 'INT',
    },
    status: {
      type: 'VARCHAR(50)',
    },
    avatar_url: {
      type: 'TEXT',
    },
    // Data Pribadi
    no_telepon: {
      type: 'VARCHAR(20)',
    },
    tempat_lahir: {
      type: 'VARCHAR(100)',
    },
    tanggal_lahir: {
      type: 'DATE',
    },
    kota: {
      type: 'VARCHAR(100)',
    },
  });

  // LECTURER_PROFILES
  pgm.createTable('lecturer_profiles', {
    user_id: {
      type: 'VARCHAR(20)',
      primaryKey: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    nip: {
      type: 'VARCHAR(50)',
      unique: true,
    },
    program_studi: {
      type: 'VARCHAR(100)',
    },
    jurusan: {
      type: 'VARCHAR(100)',
    },
    status: {
      type: 'VARCHAR(50)',
    },
    avatar_url: {
      type: 'TEXT',
    },
    // Data Pribadi
    no_telepon: {
      type: 'VARCHAR(20)',
    },
    tempat_lahir: {
      type: 'VARCHAR(100)',
    },
    tanggal_lahir: {
      type: 'DATE',
    },
    kota: {
      type: 'VARCHAR(100)',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('lecturer_profiles', { cascade: true });
  pgm.dropTable('student_profiles', { cascade: true });
};
