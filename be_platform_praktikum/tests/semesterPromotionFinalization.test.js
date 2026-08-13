const test = require('node:test');
const assert = require('node:assert/strict');
const AcademicDataService = require('../src/services/postgres/admin/AcademicDataService');
const CoursesService = require('../src/services/postgres/student/CoursesService');

function createService(handler) {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql: String(sql), params });
      return handler(String(sql), params, queries);
    },
    release() {},
  };
  const service = new AcademicDataService();
  service._pool = {
    connect: async () => client,
    query: async (sql, params = []) => {
      queries.push({ sql: String(sql), params });
      return handler(String(sql), params, queries);
    },
  };
  return { service, queries };
}

function transitionHandler(options = {}) {
  const {
    sourceFound = true,
    studentActive = true,
    targetFound = true,
    targetSemester = 3,
    duplicateTargetPeriod = false,
  } = options;

  return (sql) => {
    const statement = sql.replace(/\s+/g, ' ').trim();
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(statement)) return { rows: [] };
    if (statement.includes('FROM kelas_semester ks') && statement.includes('WHERE ks.id = $1') && statement.includes('ts.tahun_semester')) {
      return {
        rows: sourceFound
          ? [{ id: 'ks-source', id_tahun_semester: 'ts-source', id_semester: 'sem-2', id_kelas: 'kelas-a', semester: 2, kelas: 'A', tahun_semester: '2025/2026 Ganjil' }]
          : [],
      };
    }
    if (statement.includes('FROM kelas_mhs km') && statement.includes('WHERE km.id_kelas_semester = $1')) {
      return {
        rows: [{
          id_kelas_mhs: 'km-source',
          id_mahasiswa: 'mhs-1',
          id_tahun_semester: 'ts-source',
          id_semester: 'sem-2',
          id_kelas: 'kelas-a',
          student_semester: 2,
          student_status: studentActive ? 'Aktif' : 'Cuti',
          is_active: true,
        }],
      };
    }
    if (statement.includes('FROM kelas_semester ks') && statement.includes('WHERE ks.id = $1') && !statement.includes('ts.tahun_semester')) {
      return {
        rows: targetFound
          ? [{ id: 'ks-target', id_tahun_semester: 'ts-target', id_semester: 'sem-3', id_kelas: 'kelas-a', semester: targetSemester, kelas: 'A', ts_status: 'active' }]
          : [],
      };
    }
    if (statement.includes('FROM kelas_mhs') && statement.includes('id_tahun_semester = $1') && (statement.includes('id_mahasiswa = $2') || statement.includes('id_mahasiswa = $3'))) {
      return { rows: duplicateTargetPeriod ? [{ exists: 1 }] : [] };
    }
    return { rows: [] };
  };
}

test('transitionStudents promotes selected active student exactly one semester without auto-creating target class', async () => {
  const { service, queries } = createService(transitionHandler());

  const result = await service.transitionStudents({
    sourceKelasSemesterId: 'ks-source',
    transitions: [{ studentId: 'mhs-1', targetKelasSemesterId: 'ks-target' }],
  });

  assert.equal(result.processed_students, 1);
  assert.equal(queries.some((q) => q.sql.includes('INSERT INTO kelas_semester')), false);
  assert.equal(queries.some((q) => q.sql.includes('INSERT INTO kelas_mhs')), true);
  assert.equal(queries.some((q) => q.sql.includes('UPDATE student_profiles SET semester = $2')), true);
  assert.equal(queries.some((q) => q.sql.includes('INSERT INTO student_class_history')), true);
  assert.equal(queries.some((q) => q.sql.includes("UPDATE tahun_semester SET status = 'active'")), false);
  assert.equal(queries.at(-1).sql, 'COMMIT');
});

test('transitionStudents rejects inactive or leave student', async () => {
  const { service, queries } = createService(transitionHandler({ studentActive: false }));

  await assert.rejects(
    () => service.transitionStudents({
      sourceKelasSemesterId: 'ks-source',
      transitions: [{ studentId: 'mhs-1', targetKelasSemesterId: 'ks-target' }],
    }),
    /MAHASISWA_NOT_ACTIVE/,
  );

  assert.equal(queries.some((q) => q.sql === 'ROLLBACK'), true);
  assert.equal(queries.some((q) => q.sql.includes('INSERT INTO kelas_mhs')), false);
});

test('transitionStudents rejects missing target class instead of auto-creating it', async () => {
  const { service, queries } = createService(transitionHandler({ targetFound: false }));

  await assert.rejects(
    () => service.transitionStudents({
      sourceKelasSemesterId: 'ks-source',
      transitions: [{ studentId: 'mhs-1', targetKelasSemesterId: 'ks-missing' }],
    }),
    /KELAS_SEMESTER_TARGET_NOT_FOUND/,
  );

  assert.equal(queries.some((q) => q.sql === 'ROLLBACK'), true);
  assert.equal(queries.some((q) => q.sql.includes('INSERT INTO kelas_semester')), false);
});

test('transitionStudents rejects semester jump higher than one level', async () => {
  const { service } = createService(transitionHandler({ targetSemester: 4 }));

  await assert.rejects(
    () => service.transitionStudents({
      sourceKelasSemesterId: 'ks-source',
      transitions: [{ studentId: 'mhs-1', targetKelasSemesterId: 'ks-target' }],
    }),
    /STUDENT_PROMOTION_SEMESTER_INVALID/,
  );
});

test('transitionStudents rejects student already assigned in target academic period', async () => {
  const { service } = createService(transitionHandler({ duplicateTargetPeriod: true }));

  await assert.rejects(
    () => service.transitionStudents({
      sourceKelasSemesterId: 'ks-source',
      transitions: [{ studentId: 'mhs-1', targetKelasSemesterId: 'ks-target' }],
    }),
    /KELAS_MAHASISWA_DUPLICATE/,
  );
});

test('manual tahun semester activation activates target academic period', async () => {
  const { service } = createService((sql) => {
    return { rows: [{ id: 'ts-target', tahun_semester: '2026/2027 Ganjil', status: 'active' }] };
  });

  const result = await service.activateTahunSemester('ts-target');
  assert.equal(result.id, 'ts-target');
});

test('student courses no longer require student curriculum mapping', async () => {
  const service = new CoursesService();
  const queries = [];
  service._pool = {
    query: async (sql) => {
      queries.push(String(sql));
      if (String(sql).includes('FROM student_profiles')) return { rows: [{ semester: 2 }] };
      return { rows: [] };
    },
  };

  const result = await service.getCoursesByStudentId('mhs-1');

  assert.deepEqual(result, []);
  assert.equal(queries.some((sql) => sql.includes('kurikulum_prodi_angkatan')), false);
  assert.equal(queries.some((sql) => sql.includes('student_profiles.id_kurikulum')), false);
});
