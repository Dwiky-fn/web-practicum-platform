exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('kelas_praktikum', {
    jumlah_jobsheet_rencana: { type: 'INT', notNull: true, default: 1 },
  });

  pgm.addColumns('jobsheet_classes', {
    urutan: { type: 'INT' },
  });

  pgm.sql(`
    WITH numbered AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY id_kelas_praktikum
          ORDER BY created_at ASC NULLS LAST, deadline ASC NULLS LAST, title ASC, id ASC
        ) AS row_num
      FROM jobsheet_classes
      WHERE id_kelas_praktikum IS NOT NULL
    )
    UPDATE jobsheet_classes jc
    SET urutan = numbered.row_num
    FROM numbered
    WHERE jc.id = numbered.id
  `);

  pgm.sql(`
    UPDATE kelas_praktikum kp
    SET jumlah_jobsheet_rencana = GREATEST(1, COALESCE(counted.total, 0))
    FROM (
      SELECT id_kelas_praktikum, COUNT(*)::int AS total
      FROM jobsheet_classes
      WHERE id_kelas_praktikum IS NOT NULL
      GROUP BY id_kelas_praktikum
    ) counted
    WHERE kp.id = counted.id_kelas_praktikum
  `);

  pgm.addConstraint(
    'kelas_praktikum',
    'kelas_praktikum_jumlah_jobsheet_rencana_check',
    'CHECK (jumlah_jobsheet_rencana >= 1)',
  );
  pgm.addConstraint(
    'jobsheet_classes',
    'jobsheet_classes_urutan_check',
    'CHECK (urutan IS NULL OR urutan >= 1)',
  );
  pgm.sql(`
    CREATE UNIQUE INDEX unique_jobsheet_class_sequence
    ON jobsheet_classes (id_kelas_praktikum, urutan)
    WHERE id_kelas_praktikum IS NOT NULL AND urutan IS NOT NULL
  `);
  pgm.createIndex('jobsheet_classes', ['id_kelas_praktikum', 'urutan'], {
    name: 'idx_jobsheet_classes_kelas_urutan',
    ifNotExists: true,
  });
};

exports.down = (pgm) => {
  pgm.dropIndex('jobsheet_classes', ['id_kelas_praktikum', 'urutan'], {
    name: 'idx_jobsheet_classes_kelas_urutan',
    ifExists: true,
  });
  pgm.sql('DROP INDEX IF EXISTS unique_jobsheet_class_sequence');
  pgm.dropConstraint('jobsheet_classes', 'jobsheet_classes_urutan_check', { ifExists: true });
  pgm.dropConstraint('kelas_praktikum', 'kelas_praktikum_jumlah_jobsheet_rencana_check', { ifExists: true });
  pgm.dropColumns('jobsheet_classes', ['urutan'], { ifExists: true });
  pgm.dropColumns('kelas_praktikum', ['jumlah_jobsheet_rencana'], { ifExists: true });
};
