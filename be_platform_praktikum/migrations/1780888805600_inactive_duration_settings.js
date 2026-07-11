exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('jobsheet_classes', {
    inactive_duration_minutes: {
      type: 'INTEGER',
    },
  });

  pgm.addConstraint(
    'jobsheet_classes',
    'jobsheet_classes_inactive_duration_minutes_check',
    'CHECK (inactive_duration_minutes IS NULL OR inactive_duration_minutes >= 1)',
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('jobsheet_classes', 'jobsheet_classes_inactive_duration_minutes_check', { ifExists: true });
  pgm.dropColumns('jobsheet_classes', ['inactive_duration_minutes'], { ifExists: true });
};
