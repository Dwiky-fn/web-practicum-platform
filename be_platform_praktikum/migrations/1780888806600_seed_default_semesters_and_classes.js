exports.shorthands = undefined;

exports.up = (pgm) => {
  // Seed default 6 semester (Semester 1 - 6)
  pgm.sql(`
    INSERT INTO semester (id, semester)
    VALUES
      ('sem-default-1', 1),
      ('sem-default-2', 2),
      ('sem-default-3', 3),
      ('sem-default-4', 4),
      ('sem-default-5', 5),
      ('sem-default-6', 6)
    ON CONFLICT (semester) DO NOTHING;
  `);

  // Seed default 5 kelas (Kelas A - E)
  pgm.sql(`
    INSERT INTO kelas (id, kelas)
    VALUES
      ('kls-default-a', 'A'),
      ('kls-default-b', 'B'),
      ('kls-default-c', 'C'),
      ('kls-default-d', 'D'),
      ('kls-default-e', 'E')
    ON CONFLICT (kelas) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM semester WHERE id LIKE 'sem-default-%';
    DELETE FROM kelas WHERE id LIKE 'kls-default-%';
  `);
};
