exports.shorthands = undefined;

exports.up = (pgm) => {
  // Insert default admin user for production
  // Password: admin123 (bcrypt hashed)
  pgm.sql(`
    INSERT INTO users (id, fullname, email, password, role, is_active)
    VALUES (
      'admin-001',
      'Administrator',
      'admin@polnep.ac.id',
      '$2b$10$J.RKjQNhPCqHVFUECCAFAuma3.ttbB8V7Mg08LDvkPoAop8S.62Du',
      'ADMIN',
      true
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  `);

  // Create admin_profile for the admin user
  pgm.sql(`
    INSERT INTO admin_profiles (user_id, study_program_id, department_id, nip)
    VALUES (
      'admin-001',
      'prodi-8',
      'dept-3',
      '000000000000000000'
    )
    ON CONFLICT (user_id) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DELETE FROM admin_profiles WHERE user_id = 'admin-001';`);
  pgm.sql(`DELETE FROM users WHERE id = 'admin-001';`);
};
