exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE task_submissions
      ADD COLUMN IF NOT EXISTS calculated_progress_score NUMERIC(5,2) NULL,
      ADD COLUMN IF NOT EXISTS score_breakdown JSONB NULL
  `);

  pgm.sql('CREATE INDEX IF NOT EXISTS idx_task_submissions_calculated_progress_score ON task_submissions (calculated_progress_score)');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_task_submissions_calculated_progress_score');
  pgm.sql(`
    ALTER TABLE task_submissions
      DROP COLUMN IF EXISTS calculated_progress_score,
      DROP COLUMN IF EXISTS score_breakdown
  `);
};
