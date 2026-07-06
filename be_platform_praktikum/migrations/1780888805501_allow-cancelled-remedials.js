exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropConstraint('jobsheet_remedials', 'jobsheet_remedials_status_check', { ifExists: true });
  pgm.addConstraint(
    'jobsheet_remedials',
    'jobsheet_remedials_status_check',
    "CHECK (status IN ('draft', 'open', 'closed', 'cancelled'))",
  );
};

exports.down = (pgm) => {
  pgm.sql("UPDATE jobsheet_remedials SET status = 'closed' WHERE status = 'cancelled'");
  pgm.dropConstraint('jobsheet_remedials', 'jobsheet_remedials_status_check', { ifExists: true });
  pgm.addConstraint(
    'jobsheet_remedials',
    'jobsheet_remedials_status_check',
    "CHECK (status IN ('draft', 'open', 'closed'))",
  );
};
