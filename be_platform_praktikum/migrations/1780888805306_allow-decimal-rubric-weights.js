exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE experiments
      ALTER COLUMN rubric TYPE NUMERIC(5,2)
      USING ROUND(rubric::numeric, 2),
      ALTER COLUMN rubric SET DEFAULT 0
  `);

  pgm.sql(`
    ALTER TABLE exercises
      ALTER COLUMN rubric TYPE NUMERIC(5,2)
      USING ROUND(rubric::numeric, 2),
      ALTER COLUMN rubric SET DEFAULT 0
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE experiments
      ALTER COLUMN rubric TYPE INTEGER
      USING ROUND(rubric)::integer,
      ALTER COLUMN rubric SET DEFAULT 0
  `);

  pgm.sql(`
    ALTER TABLE exercises
      ALTER COLUMN rubric TYPE INTEGER
      USING ROUND(rubric)::integer,
      ALTER COLUMN rubric SET DEFAULT 0
  `);
};
