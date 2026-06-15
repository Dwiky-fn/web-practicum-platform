exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('users', {
    avatar_url: {
      type: 'TEXT',
      notNull: false,
    },
  });

  pgm.sql(`
    UPDATE users u
    SET avatar_url = COALESCE(u.avatar_url, sp.avatar_url)
    FROM student_profiles sp
    WHERE sp.user_id = u.id
      AND u.role = 'MAHASISWA'
      AND sp.avatar_url IS NOT NULL
  `);

  pgm.sql(`
    UPDATE users u
    SET avatar_url = COALESCE(u.avatar_url, lp.avatar_url)
    FROM lecturer_profiles lp
    WHERE lp.user_id = u.id
      AND u.role = 'DOSEN'
      AND lp.avatar_url IS NOT NULL
  `);

  pgm.dropColumn('student_profiles', 'avatar_url');
  pgm.dropColumn('lecturer_profiles', 'avatar_url');
};

exports.down = (pgm) => {
  pgm.addColumn('student_profiles', {
    avatar_url: {
      type: 'TEXT',
      notNull: false,
    },
  });

  pgm.addColumn('lecturer_profiles', {
    avatar_url: {
      type: 'TEXT',
      notNull: false,
    },
  });

  pgm.sql(`
    UPDATE student_profiles sp
    SET avatar_url = u.avatar_url
    FROM users u
    WHERE u.id = sp.user_id
      AND u.role = 'MAHASISWA'
      AND u.avatar_url IS NOT NULL
  `);

  pgm.sql(`
    UPDATE lecturer_profiles lp
    SET avatar_url = u.avatar_url
    FROM users u
    WHERE u.id = lp.user_id
      AND u.role = 'DOSEN'
      AND u.avatar_url IS NOT NULL
  `);

  pgm.dropColumn('users', 'avatar_url');
};
