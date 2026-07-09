const autoBind = require('auto-bind');
const { created, handleAdminError, ok } = require('../utils');
const Validator = require('../../../validator/admin/academicData');

class AcademicDataHandler {
  constructor(service) {
    this._service = service;
    autoBind(this);
  }

  async getTahunSemesterHandler(req, res) {
    return ok(res, { tahun_semester: await this._service.getTahunSemester() });
  }

  async createTahunSemesterHandler(req, res) {
    const payload = Validator.validateTahunSemesterPayload(req.body);
    return created(res, { tahun_semester: await this._service.createTahunSemester(payload) }, 'Tahun semester berhasil ditambahkan');
  }

  async updateTahunSemesterHandler(req, res) {
    const payload = Validator.validateUpdateTahunSemesterPayload(req.body);
    return ok(res, { tahun_semester: await this._service.updateTahunSemester(req.params.id, payload) }, 'Tahun semester berhasil diperbarui');
  }

  async deleteTahunSemesterHandler(req, res) {
    const force = req.query.force === 'true';
    await this._service.deleteTahunSemester(req.params.id, force);
    return ok(res, {}, 'Tahun semester berhasil dihapus');
  }

  async activateTahunSemesterHandler(req, res) {
    return ok(res, { tahun_semester: await this._service.activateTahunSemester(req.params.id) }, 'Tahun semester berhasil diaktifkan');
  }

  async initialActivateTahunSemesterHandler(req, res) {
    return ok(res, { tahun_semester: await this._service.initialActivateTahunSemester(req.params.id) }, 'Tahun semester awal berhasil diaktifkan');
  }

  async getKurikulumHandler(req, res) {
    return ok(res, { kurikulum: await this._service.getKurikulum() });
  }

  async createKurikulumHandler(req, res) {
    const payload = Validator.validateKurikulumPayload(req.body);
    return created(res, { kurikulum: await this._service.createKurikulum(payload) }, 'Kurikulum berhasil ditambahkan');
  }

  async updateKurikulumHandler(req, res) {
    const payload = Validator.validateUpdateKurikulumPayload(req.body);
    return ok(res, { kurikulum: await this._service.updateKurikulum(req.params.id, payload) }, 'Kurikulum berhasil diperbarui');
  }

  async deleteKurikulumHandler(req, res) {
    const force = req.query.force === 'true';
    await this._service.deleteKurikulum(req.params.id, force);
    return ok(res, {}, 'Kurikulum berhasil dihapus');
  }

  async activateKurikulumHandler(req, res) {
    return ok(res, { kurikulum: await this._service.activateKurikulum(req.params.id) }, 'Kurikulum berhasil diaktifkan');
  }

  async getSemesterHandler(req, res) {
    return ok(res, { semester: await this._service.getSemester() });
  }

  async createSemesterHandler(req, res) {
    const payload = Validator.validateSemesterPayload(req.body);
    return created(res, { semester: await this._service.createSemester(payload) }, 'Semester berhasil ditambahkan');
  }

  async updateSemesterHandler(req, res) {
    const payload = Validator.validateSemesterPayload(req.body);
    return ok(res, { semester: await this._service.updateSemester(req.params.id, payload) }, 'Semester berhasil diperbarui');
  }

  async deleteSemesterHandler(req, res) {
    const force = req.query.force === 'true';
    await this._service.deleteSemester(req.params.id, force);
    return ok(res, {}, 'Semester berhasil dihapus');
  }

  async getKelasHandler(req, res) {
    return ok(res, { kelas: await this._service.getKelas() });
  }

  async createKelasHandler(req, res) {
    const payload = Validator.validateKelasPayload(req.body);
    return created(res, { kelas: await this._service.createKelas(payload) }, 'Kelas berhasil ditambahkan');
  }

  async updateKelasHandler(req, res) {
    const payload = Validator.validateKelasPayload(req.body);
    return ok(res, { kelas: await this._service.updateKelas(req.params.id, payload) }, 'Kelas berhasil diperbarui');
  }

  async deleteKelasHandler(req, res) {
    const force = req.query.force === 'true';
    await this._service.deleteKelas(req.params.id, force);
    return ok(res, {}, 'Kelas berhasil dihapus');
  }

  async getMataKuliahHandler(req, res) {
    return ok(res, { mata_kuliah: await this._service.getMataKuliah(req.query) });
  }

  async getMataKuliahByKurikulumHandler(req, res) {
    return ok(res, { mata_kuliah: await this._service.getMataKuliah({ id_kurikulum: req.params.id_kurikulum }) });
  }

  async createMataKuliahHandler(req, res) {
    const payload = Validator.validateMataKuliahPayload(req.body);
    return created(res, { mata_kuliah: await this._service.createMataKuliah(payload) }, 'Mata kuliah berhasil ditambahkan');
  }

  async updateMataKuliahHandler(req, res) {
    const payload = Validator.validateUpdateMataKuliahPayload(req.body);
    return ok(res, { mata_kuliah: await this._service.updateMataKuliah(req.params.id, payload) }, 'Mata kuliah berhasil diperbarui');
  }

  async deleteMataKuliahHandler(req, res) {
    const force = req.query.force === 'true';
    await this._service.deleteMataKuliah(req.params.id, force);
    return ok(res, {}, 'Mata kuliah berhasil dihapus');
  }

  async getKelasMahasiswaHandler(req, res) {
    const query = Validator.validateKelasMahasiswaQuery(req.query);
    return ok(res, { kelas_mahasiswa: await this._service.getKelasMahasiswa(query) });
  }

  async createKelasMahasiswaHandler(req, res) {
    const payload = Validator.validateKelasMahasiswaPayload(req.body);
    return created(res, { kelas_mahasiswa: await this._service.createKelasMahasiswa(payload) }, 'Kelas mahasiswa berhasil ditambahkan');
  }

  async updateKelasMahasiswaHandler(req, res) {
    const payload = Validator.validateUpdateKelasMahasiswaPayload(req.body);
    return ok(res, { kelas_mahasiswa: await this._service.updateKelasMahasiswa(req.params.id, payload) }, 'Kelas mahasiswa berhasil diperbarui');
  }

  async deleteKelasMahasiswaHandler(req, res) {
    const force = req.query.force === 'true';
    await this._service.deleteKelasMahasiswa(req.params.id, force);
    return ok(res, {}, 'Kelas mahasiswa berhasil dihapus');
  }

  async getKelasPraktikumHandler(req, res) {
    return ok(res, { kelas_praktikum: await this._service.getKelasPraktikum(req.query) });
  }

  async getKelasPraktikumByIdHandler(req, res) {
    return ok(res, { kelas_praktikum: await this._service.getKelasPraktikumById(req.params.id) });
  }

  async getKelasPraktikumMahasiswaHandler(req, res) {
    return ok(res, { mahasiswa: await this._service.getKelasPraktikumMahasiswa(req.params.id) });
  }

  async getKelasPraktikumPengampuHandler(req, res) {
    return ok(res, { pengampu: await this._service.getPengampu({ id_kelas_praktikum: req.params.id }) });
  }

  async createKelasPraktikumHandler(req, res) {
    const payload = Validator.validateKelasPraktikumPayload(req.body);
    return created(res, { kelas_praktikum: await this._service.createKelasPraktikum(payload) }, 'Kelas praktikum berhasil ditambahkan');
  }

  async updateKelasPraktikumHandler(req, res) {
    const payload = Validator.validateUpdateKelasPraktikumPayload(req.body);
    return ok(res, { kelas_praktikum: await this._service.updateKelasPraktikum(req.params.id, payload) }, 'Kelas praktikum berhasil diperbarui');
  }

  async deleteKelasPraktikumHandler(req, res) {
    await this._service.deleteKelasPraktikum(req.params.id);
    return ok(res, {}, 'Kelas praktikum berhasil dihapus');
  }

  async getPengampuHandler(req, res) {
    return ok(res, { pengampu: await this._service.getPengampu(req.query) });
  }

  async getPengampuByDosenHandler(req, res) {
    return ok(res, { pengampu: await this._service.getPengampu({ id_dosen: req.params.id_dosen }) });
  }

  async getPengampuByKelasPraktikumHandler(req, res) {
    return ok(res, { pengampu: await this._service.getPengampu({ id_kelas_praktikum: req.params.id_kelas_praktikum }) });
  }

  async createPengampuHandler(req, res) {
    const payload = Validator.validatePengampuPayload(req.body);
    return created(res, { pengampu: await this._service.createPengampu(payload) }, 'Pengampu berhasil ditambahkan');
  }

  async updatePengampuHandler(req, res) {
    const payload = Validator.validateUpdatePengampuPayload(req.body);
    return ok(res, { pengampu: await this._service.updatePengampu(req.params.id, payload) }, 'Pengampu berhasil diperbarui');
  }

  async deletePengampuHandler(req, res) {
    await this._service.deletePengampu(req.params.id);
    return ok(res, {}, 'Pengampu berhasil dihapus');
  }

  async getKelasSemesterHandler(req, res) {
    return ok(res, { kelas_semester: await this._service.getKelasSemester(req.query) });
  }

  async createKelasSemesterHandler(req, res) {
    const payload = Validator.validateKelasSemesterPayload(req.body);
    return created(res, { kelas_semester: await this._service.createKelasSemester(payload) }, 'Kelas semester berhasil dibuat');
  }

  async updateKelasSemesterHandler(req, res) {
    const payload = Validator.validateUpdateKelasSemesterPayload(req.body);
    return ok(res, { kelas_semester: await this._service.updateKelasSemester(req.params.id, payload) }, 'Kelas semester berhasil diperbarui');
  }

  async deleteKelasSemesterHandler(req, res) {
    await this._service.deleteKelasSemester(req.params.id);
    return ok(res, {}, 'Kelas berhasil dihapus');
  }

  async transitionStudentsHandler(req, res) {
    const payload = Validator.validateStudentTransitionPayload(req.body);
    return ok(res, { result: await this._service.transitionStudents(payload) }, 'Kenaikan semester berhasil diproses');
  }

}

module.exports = AcademicDataHandler;
