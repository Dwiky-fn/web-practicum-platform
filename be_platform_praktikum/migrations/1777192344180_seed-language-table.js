exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO programming_languages 
    (name, display_name, judge0_language_id, file_extension)
    VALUES
    ('java', 'Java', 62, '.java'),
    ('javascript', 'JavaScript', 63, '.js'),
    ('typescript', 'TypeScript', 74, '.ts'),
    ('python', 'Python', 71, '.py'),
    ('c', 'C', 50, '.c'),
    ('cpp', 'C++', 54, '.cpp'),
    ('csharp', 'C#', 51, '.cs'),
    ('go', 'Go', 60, '.go'),
    ('kotlin', 'Kotlin', 78, '.kt'),
    ('php', 'PHP', 68, '.php'),
    ('ruby', 'Ruby', 72, '.rb'),
    ('rust', 'Rust', 73, '.rs'),
    ('swift', 'Swift', 83, '.swift')
    ON CONFLICT (name) DO NOTHING
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM programming_languages
    WHERE name IN (
      'java','javascript','typescript','python','c','cpp',
      'csharp','go','kotlin','php','ruby','rust','swift'
    )
  `);
};
