exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.dropConstraint('classes', 'classes_status_check');
  pgm.addConstraint(
    'classes',
    'classes_status_check',
    "CHECK (status IN ('AKTIF', 'NONAKTIF', 'ARSIP'))",
  );
};

exports.down = (pgm) => {
  pgm.dropConstraint('classes', 'classes_status_check');
  pgm.addConstraint(
    'classes',
    'classes_status_check',
    "CHECK (status IN ('AKTIF', 'NONAKTIF', 'SELESAI'))",
  );
};
