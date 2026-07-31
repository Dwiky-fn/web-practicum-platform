exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='jobsheet_classes' AND column_name='class_id'
      ) THEN
        ALTER TABLE jobsheet_classes ALTER COLUMN class_id DROP NOT NULL;
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
        WHERE table_name='jobsheet_classes' AND column_name='class_id'
      ) THEN
        ALTER TABLE jobsheet_classes ALTER COLUMN class_id SET NOT NULL;
      END IF;
    END $$;
  `);
};
