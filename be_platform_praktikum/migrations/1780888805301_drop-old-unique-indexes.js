exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS unique_submission_per_kelas_praktikum');
  pgm.sql('DROP INDEX IF EXISTS unique_submission_without_kelas_praktikum');
  pgm.sql('DROP INDEX IF EXISTS unique_student_jobsheet_kelas_praktikum');
  pgm.sql('DROP INDEX IF EXISTS unique_student_snapshot_kelas_praktikum');
};

exports.down = (pgm) => {
  pgm.sql(`
    CREATE UNIQUE INDEX unique_submission_per_kelas_praktikum 
    ON task_submissions (jobsheet_id, student_id, id_kelas_praktikum) 
    WHERE (id_kelas_praktikum IS NOT NULL)
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_submission_without_kelas_praktikum 
    ON task_submissions (jobsheet_id, student_id) 
    WHERE (id_kelas_praktikum IS NULL)
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_student_jobsheet_kelas_praktikum 
    ON student_progress (student_id, jobsheet_id, id_kelas_praktikum) 
    WHERE (id_kelas_praktikum IS NOT NULL)
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_student_snapshot_kelas_praktikum 
    ON student_jobsheet_progress (student_id, id_kelas_praktikum, jobsheet_id) 
    WHERE (id_kelas_praktikum IS NOT NULL)
  `);
};
