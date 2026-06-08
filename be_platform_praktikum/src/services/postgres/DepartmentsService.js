const pool = require('./index');

class DepartmentsService {
  constructor() {
    this._pool = pool;
  }

  async getDepartments() {
    const deptResult = await this._pool.query('SELECT id, name FROM departments ORDER BY name ASC');
    const prodiResult = await this._pool.query('SELECT id, department_id, name FROM study_programs ORDER BY name ASC');

    return deptResult.rows.map(dept => ({
      id: dept.id,
      name: dept.name,
      studyPrograms: prodiResult.rows
        .filter(prodi => prodi.department_id === dept.id)
        .map(prodi => ({
          id: prodi.id,
          name: prodi.name
        }))
    }));
  }
}

module.exports = DepartmentsService;
