exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS unique_jobsheet_kelas_praktikum
    ON jobsheet_classes (jobsheet_id, id_kelas_praktikum)
    WHERE id_kelas_praktikum IS NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS unique_jobsheet_kelas_praktikum');
};
