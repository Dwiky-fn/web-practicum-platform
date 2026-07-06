exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE jobsheet_remedials
    SET start_at = start_at + INTERVAL '7 hours',
        end_at = end_at + INTERVAL '7 hours'
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE jobsheet_remedials
    SET start_at = start_at - INTERVAL '7 hours',
        end_at = end_at - INTERVAL '7 hours'
  `);
};
