const test = require('node:test');
const assert = require('node:assert/strict');
const AcademicDataService = require('../src/services/postgres/admin/AcademicDataService');

function createServiceWithClient(handler) {
  const queries = [];
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      return handler(sql, params);
    },
    release() {},
  };

  const service = new AcademicDataService();
  service._pool = {
    connect: async () => client,
    query: async (sql, params = []) => {
      queries.push({ sql, params });
      if (String(sql).includes('FROM kurikulum')) {
        return {
          rows: [
            { id: 'kur_a', tahun_kurikulum: '2023', nama_kurikulum: 'Kurikulum A', status: 'active' },
            { id: 'kur_b', tahun_kurikulum: '2024', nama_kurikulum: 'Kurikulum B', status: 'active' },
          ],
        };
      }
      return { rows: [] };
    },
  };

  return { service, queries };
}

test('activateKurikulum allows more than one active curriculum', async () => {
  const { service, queries } = createServiceWithClient((sql) => {
    const statement = String(sql);
    if (statement === 'BEGIN' || statement === 'COMMIT' || statement === 'ROLLBACK') return { rows: [] };
    if (statement.includes('SELECT id FROM kurikulum WHERE id = $1')) return { rows: [{ id: 'kur_b' }] };
    if (statement.includes('UPDATE kurikulum')) return { rows: [{ id: 'kur_b' }] };
    return { rows: [] };
  });

  const result = await service.activateKurikulum('kur_b');

  assert.equal(result.status, 'active');
  assert.equal(
    queries.some(({ sql }) => String(sql).includes("UPDATE kurikulum SET status = 'inactive'")),
    false,
  );
});

test('updateKurikulum rejects duplicate identity while excluding edited id', async () => {
  let duplicateCheckParams = null;
  const { service } = createServiceWithClient((sql, params) => {
    const statement = String(sql);
    if (statement === 'BEGIN' || statement === 'ROLLBACK') return { rows: [] };
    if (statement.includes('SELECT id FROM kurikulum WHERE id = $1')) return { rows: [{ id: 'kur_b' }] };
    if (statement.includes('SELECT tahun_kurikulum, nama_kurikulum FROM kurikulum')) {
      return { rows: [{ tahun_kurikulum: '2024', nama_kurikulum: 'Kurikulum B' }] };
    }
    if (statement.includes('FROM kurikulum') && statement.includes('LOWER(tahun_kurikulum)')) {
      duplicateCheckParams = params;
      return { rows: [{ id: 'kur_a' }] };
    }
    return { rows: [] };
  });

  await assert.rejects(
    () => service.updateKurikulum('kur_b', { nama_kurikulum: 'Kurikulum A' }),
    /KURIKULUM_DUPLICATE/,
  );

  assert.deepEqual(duplicateCheckParams, ['2024', 'kurikulum a', 'kur_b']);
});
