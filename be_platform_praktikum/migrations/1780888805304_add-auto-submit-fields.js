exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE task_submissions
      ADD COLUMN IF NOT EXISTS is_auto_submitted BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS auto_submitted_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS submission_source VARCHAR(30) NOT NULL DEFAULT 'manual'
  `);

  pgm.sql(`
    ALTER TABLE task_submissions
      DROP CONSTRAINT IF EXISTS task_submissions_source_check
  `);

  pgm.sql(`
    ALTER TABLE task_submissions
      ADD CONSTRAINT task_submissions_source_check
      CHECK (submission_source IN ('manual', 'auto_deadline', 'remedial'))
  `);

  pgm.sql('CREATE INDEX IF NOT EXISTS idx_task_submissions_submission_source ON task_submissions (submission_source)');
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_task_submissions_is_auto_submitted ON task_submissions (is_auto_submitted)');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_task_submissions_submission_source');
  pgm.sql('DROP INDEX IF EXISTS idx_task_submissions_is_auto_submitted');
  pgm.sql('ALTER TABLE task_submissions DROP CONSTRAINT IF EXISTS task_submissions_source_check');
  pgm.sql(`
    ALTER TABLE task_submissions
      DROP COLUMN IF EXISTS is_auto_submitted,
      DROP COLUMN IF EXISTS auto_submitted_at,
      DROP COLUMN IF EXISTS submission_source
  `);
};
