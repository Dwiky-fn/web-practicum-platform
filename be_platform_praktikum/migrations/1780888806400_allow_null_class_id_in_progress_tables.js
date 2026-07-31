exports.shorthands = undefined;

exports.up = (pgm) => {
  // student_progress: class_id is now replaced by id_kelas_praktikum, make it nullable
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='student_progress' AND column_name='class_id'
      ) THEN
        ALTER TABLE student_progress ALTER COLUMN class_id DROP NOT NULL;
      END IF;
    END $$;
  `);

  // student_jobsheet_progress: class_id is now replaced by id_kelas_praktikum, make it nullable
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='student_jobsheet_progress' AND column_name='class_id'
      ) THEN
        ALTER TABLE student_jobsheet_progress ALTER COLUMN class_id DROP NOT NULL;
      END IF;
    END $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='student_progress' AND column_name='class_id'
      ) THEN
        UPDATE student_progress SET class_id = COALESCE(class_id, id_kelas_praktikum, 'unknown') WHERE class_id IS NULL;
        ALTER TABLE student_progress ALTER COLUMN class_id SET NOT NULL;
      END IF;
    END $$;
  `);

  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='student_jobsheet_progress' AND column_name='class_id'
      ) THEN
        UPDATE student_jobsheet_progress SET class_id = COALESCE(class_id, id_kelas_praktikum, 'unknown') WHERE class_id IS NULL;
        ALTER TABLE student_jobsheet_progress ALTER COLUMN class_id SET NOT NULL;
      END IF;
    END $$;
  `);
};
