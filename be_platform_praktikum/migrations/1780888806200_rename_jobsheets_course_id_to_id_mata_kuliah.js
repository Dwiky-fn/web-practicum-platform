exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='jobsheets' AND column_name='course_id'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='jobsheets' AND column_name='id_mata_kuliah'
      ) THEN
        ALTER TABLE jobsheets RENAME COLUMN course_id TO id_mata_kuliah;
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
        WHERE table_name='jobsheets' AND column_name='id_mata_kuliah'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='jobsheets' AND column_name='course_id'
      ) THEN
        ALTER TABLE jobsheets RENAME COLUMN id_mata_kuliah TO course_id;
      END IF;
    END $$;
  `);
};
