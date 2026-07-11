exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('experiments', {
    inactive_duration_minutes: {
      type: 'INTEGER',
    },
  });

  pgm.addColumns('exercises', {
    inactive_duration_minutes: {
      type: 'INTEGER',
    },
  });

  pgm.addConstraint(
    'experiments',
    'experiments_inactive_duration_minutes_check',
    'CHECK (inactive_duration_minutes IS NULL OR inactive_duration_minutes >= 1)',
  );

  pgm.addConstraint(
    'exercises',
    'exercises_inactive_duration_minutes_check',
    'CHECK (inactive_duration_minutes IS NULL OR inactive_duration_minutes >= 1)',
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('experiments', 'experiments_inactive_duration_minutes_check', { ifExists: true });
  pgm.dropConstraint('exercises', 'exercises_inactive_duration_minutes_check', { ifExists: true });
  pgm.dropColumns('experiments', ['inactive_duration_minutes'], { ifExists: true });
  pgm.dropColumns('exercises', ['inactive_duration_minutes'], { ifExists: true });
};
