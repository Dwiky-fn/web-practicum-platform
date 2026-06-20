exports.shorthands = undefined;

exports.up = (pgm) => {
  // 1. Create jobsheet_remedials
  pgm.createTable('jobsheet_remedials', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    jobsheet_id: { type: 'VARCHAR(20)', notNull: true, references: 'jobsheets(id)', onDelete: 'CASCADE' },
    id_kelas_praktikum: { type: 'VARCHAR(20)', notNull: true, references: 'kelas_praktikum(id)', onDelete: 'CASCADE' },
    title: { type: 'VARCHAR(100)', notNull: true },
    description: { type: 'TEXT' },
    start_at: { type: 'TIMESTAMP', notNull: true },
    end_at: { type: 'TIMESTAMP', notNull: true },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'draft' },
    created_by: { type: 'VARCHAR(20)', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('jobsheet_remedials', 'jobsheet_remedials_status_check', "CHECK (status IN ('draft', 'open', 'closed'))");
  pgm.createIndex('jobsheet_remedials', ['jobsheet_id']);
  pgm.createIndex('jobsheet_remedials', ['id_kelas_praktikum']);

  // 2. Create jobsheet_remedial_students
  pgm.createTable('jobsheet_remedial_students', {
    id: { type: 'VARCHAR(20)', primaryKey: true },
    remedial_id: { type: 'VARCHAR(20)', notNull: true, references: 'jobsheet_remedials(id)', onDelete: 'CASCADE' },
    student_id: { type: 'VARCHAR(20)', notNull: true, references: 'users(id)', onDelete: 'CASCADE' },
    id_kelas_mhs: { type: 'VARCHAR(20)', notNull: true, references: 'kelas_mhs(id)', onDelete: 'CASCADE' },
    source_submission_id: { type: 'VARCHAR(20)' },
    status: { type: 'VARCHAR(20)', notNull: true, default: 'assigned' },
    assigned_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
  });
  pgm.addConstraint('jobsheet_remedial_students', 'jobsheet_remedial_students_status_check', "CHECK (status IN ('assigned', 'in_progress', 'submitted', 'reviewed'))");
  pgm.addConstraint('jobsheet_remedial_students', 'unique_remedial_student', 'UNIQUE(remedial_id, student_id)');
  pgm.createIndex('jobsheet_remedial_students', ['remedial_id']);
  pgm.createIndex('jobsheet_remedial_students', ['student_id']);

  // 3. Add columns to task_submissions
  pgm.addColumns('task_submissions', {
    attempt_no: { type: 'INTEGER', notNull: true, default: 1 },
    attempt_type: { type: 'VARCHAR(20)', notNull: true, default: 'normal' },
    attempt_label: { type: 'VARCHAR(50)', notNull: true, default: 'Pengerjaan Normal' },
    remedial_id: { type: 'VARCHAR(20)', references: 'jobsheet_remedials(id)', onDelete: 'SET NULL' },
    parent_submission_id: { type: 'VARCHAR(20)', references: 'task_submissions(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('task_submissions', ['remedial_id']);
  pgm.createIndex('task_submissions', ['parent_submission_id']);

  // Add references constraint for source_submission_id in jobsheet_remedial_students
  pgm.addConstraint('jobsheet_remedial_students', 'fk_source_submission', 'FOREIGN KEY(source_submission_id) REFERENCES task_submissions(id) ON DELETE SET NULL');

  // Drop old unique constraint unique_jobsheet_student on task_submissions
  pgm.dropConstraint('task_submissions', 'unique_jobsheet_student', { ifExists: true });

  // Create new unique indexes for task_submissions
  pgm.sql(`
    CREATE UNIQUE INDEX unique_normal_submission 
    ON task_submissions (student_id, jobsheet_id, id_kelas_praktikum) 
    WHERE (remedial_id IS NULL)
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_remedial_submission 
    ON task_submissions (student_id, jobsheet_id, id_kelas_praktikum, remedial_id) 
    WHERE (remedial_id IS NOT NULL)
  `);

  // 4. Add columns to student_progress
  pgm.addColumns('student_progress', {
    attempt_no: { type: 'INTEGER', notNull: true, default: 1 },
    attempt_type: { type: 'VARCHAR(20)', notNull: true, default: 'normal' },
    remedial_id: { type: 'VARCHAR(20)', references: 'jobsheet_remedials(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('student_progress', ['remedial_id']);

  // Drop old unique constraint unique_student_jobsheet_class on student_progress
  pgm.dropConstraint('student_progress', 'unique_student_jobsheet_class', { ifExists: true });

  // Create new unique indexes for student_progress
  pgm.sql(`
    CREATE UNIQUE INDEX unique_normal_student_progress 
    ON student_progress (student_id, jobsheet_id, id_kelas_praktikum) 
    WHERE (remedial_id IS NULL)
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_remedial_student_progress 
    ON student_progress (student_id, jobsheet_id, id_kelas_praktikum, remedial_id) 
    WHERE (remedial_id IS NOT NULL)
  `);

  // 5. Add columns to student_jobsheet_progress
  pgm.addColumns('student_jobsheet_progress', {
    attempt_no: { type: 'INTEGER', notNull: true, default: 1 },
    attempt_type: { type: 'VARCHAR(20)', notNull: true, default: 'normal' },
    remedial_id: { type: 'VARCHAR(20)', references: 'jobsheet_remedials(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('student_jobsheet_progress', ['remedial_id']);

  // Drop old unique constraint unique_student_jobsheet_progress on student_jobsheet_progress
  pgm.dropConstraint('student_jobsheet_progress', 'unique_student_jobsheet_progress', { ifExists: true });

  // Create new unique indexes for student_jobsheet_progress
  pgm.sql(`
    CREATE UNIQUE INDEX unique_normal_student_jobsheet_progress 
    ON student_jobsheet_progress (student_id, jobsheet_id, id_kelas_praktikum) 
    WHERE (remedial_id IS NULL)
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX unique_remedial_student_jobsheet_progress 
    ON student_jobsheet_progress (student_id, jobsheet_id, id_kelas_praktikum, remedial_id) 
    WHERE (remedial_id IS NOT NULL)
  `);

  // 6. Add columns to student_jobsheet_activity_logs
  pgm.addColumns('student_jobsheet_activity_logs', {
    attempt_no: { type: 'INTEGER', notNull: true, default: 1 },
    remedial_id: { type: 'VARCHAR(20)', references: 'jobsheet_remedials(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('student_jobsheet_activity_logs', ['remedial_id']);
};

exports.down = (pgm) => {
  pgm.dropColumns('student_jobsheet_activity_logs', ['attempt_no', 'remedial_id'], { ifExists: true });

  pgm.sql('DROP INDEX IF EXISTS unique_normal_student_jobsheet_progress');
  pgm.sql('DROP INDEX IF EXISTS unique_remedial_student_jobsheet_progress');
  pgm.dropColumns('student_jobsheet_progress', ['attempt_no', 'attempt_type', 'remedial_id'], { ifExists: true });
  pgm.addConstraint('student_jobsheet_progress', 'unique_student_jobsheet_progress', 'UNIQUE(student_id, class_id, jobsheet_id)');

  pgm.sql('DROP INDEX IF EXISTS unique_normal_student_progress');
  pgm.sql('DROP INDEX IF EXISTS unique_remedial_student_progress');
  pgm.dropColumns('student_progress', ['attempt_no', 'attempt_type', 'remedial_id'], { ifExists: true });
  pgm.addConstraint('student_progress', 'unique_student_jobsheet_class', 'UNIQUE(student_id, jobsheet_id, class_id)');

  pgm.dropConstraint('jobsheet_remedial_students', 'fk_source_submission', { ifExists: true });

  pgm.sql('DROP INDEX IF EXISTS unique_normal_submission');
  pgm.sql('DROP INDEX IF EXISTS unique_remedial_submission');
  pgm.dropColumns('task_submissions', ['attempt_no', 'attempt_type', 'attempt_label', 'remedial_id', 'parent_submission_id'], { ifExists: true });
  pgm.addConstraint('task_submissions', 'unique_jobsheet_student', 'UNIQUE(jobsheet_id, student_id)');

  pgm.dropTable('jobsheet_remedial_students', { cascade: true });
  pgm.dropTable('jobsheet_remedials', { cascade: true });
};
