exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('kelas_praktikum', {
    legacy_class_id: {
      type: 'VARCHAR(20)',
      references: 'classes(id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('kelas_praktikum', ['legacy_class_id']);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_kelas_praktikum_legacy_class
    ON kelas_praktikum (legacy_class_id)
    WHERE legacy_class_id IS NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS unique_kelas_praktikum_legacy_class');
  pgm.dropColumns('kelas_praktikum', ['legacy_class_id'], { ifExists: true });
};
