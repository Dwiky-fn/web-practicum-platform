exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. TABEL LANGUAGES
  pgm.createTable('programming_languages', {
    id: {
      type: 'SERIAL',
      primaryKey: true,
    },
    name: {
      type: 'VARCHAR(50)',
      notNull: true,
      unique: true,
    },
    display_name: {
      type: 'VARCHAR(50)',
      notNull: true,
    },
    judge0_language_id: {
      type: 'INTEGER',
      notNull: true,
    },
    file_extension: {
      type: 'VARCHAR(10)',
      notNull: true,
    },
  });

  // 2. TAMBAH KOLOM DI JOBSHEETS
  pgm.addColumn('jobsheets', {
    programming_language_id: {
      type: 'INTEGER',
      references: 'programming_languages(id)',
      onDelete: 'RESTRICT',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('jobsheets', 'programming_language_id');
  pgm.dropTable('programming_languages');
};
