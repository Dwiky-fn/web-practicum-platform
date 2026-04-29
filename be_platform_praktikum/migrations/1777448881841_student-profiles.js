exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('student_profiles', {
    user_id: {
      type: 'VARCHAR(50)',
      primaryKey: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },

    nim: {
      type: 'VARCHAR(50)',
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
  });

  pgm.createIndex('student_profiles', ['user_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('student_profiles');
};
