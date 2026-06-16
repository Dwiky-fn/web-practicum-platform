const express = require('express');
const { requireRoles } = require('../../../middlewares/auth');
const { handleAdminError } = require('../utils');

const routes = (handler) => {
  const router = express.Router();
  const adminOnly = requireRoles('ADMIN');
  const safe = (fn) => async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      handleAdminError(error, res);
    }
  };

  router.get('/tahun-semester', adminOnly, safe(handler.getTahunSemesterHandler));
  router.post('/tahun-semester', adminOnly, safe(handler.createTahunSemesterHandler));
  router.put('/tahun-semester/:id', adminOnly, safe(handler.updateTahunSemesterHandler));
  router.delete('/tahun-semester/:id', adminOnly, safe(handler.deleteTahunSemesterHandler));
  router.patch('/tahun-semester/:id/activate', adminOnly, safe(handler.activateTahunSemesterHandler));

  router.get('/kurikulum', adminOnly, safe(handler.getKurikulumHandler));
  router.post('/kurikulum', adminOnly, safe(handler.createKurikulumHandler));
  router.put('/kurikulum/:id', adminOnly, safe(handler.updateKurikulumHandler));
  router.delete('/kurikulum/:id', adminOnly, safe(handler.deleteKurikulumHandler));
  router.patch('/kurikulum/:id/activate', adminOnly, safe(handler.activateKurikulumHandler));

  router.get('/semester', adminOnly, safe(handler.getSemesterHandler));
  router.post('/semester', adminOnly, safe(handler.createSemesterHandler));
  router.put('/semester/:id', adminOnly, safe(handler.updateSemesterHandler));
  router.delete('/semester/:id', adminOnly, safe(handler.deleteSemesterHandler));

  router.get('/kelas', adminOnly, safe(handler.getKelasHandler));
  router.post('/kelas', adminOnly, safe(handler.createKelasHandler));
  router.put('/kelas/:id', adminOnly, safe(handler.updateKelasHandler));
  router.delete('/kelas/:id', adminOnly, safe(handler.deleteKelasHandler));

  router.get('/mata-kuliah/by-kurikulum/:id_kurikulum', adminOnly, safe(handler.getMataKuliahByKurikulumHandler));
  router.get('/mata-kuliah', adminOnly, safe(handler.getMataKuliahHandler));
  router.post('/mata-kuliah', adminOnly, safe(handler.createMataKuliahHandler));
  router.put('/mata-kuliah/:id', adminOnly, safe(handler.updateMataKuliahHandler));
  router.delete('/mata-kuliah/:id', adminOnly, safe(handler.deleteMataKuliahHandler));

  router.get('/kelas-mahasiswa/by-filter', adminOnly, safe(handler.getKelasMahasiswaHandler));
  router.get('/kelas-mahasiswa', adminOnly, safe(handler.getKelasMahasiswaHandler));
  router.post('/kelas-mahasiswa', adminOnly, safe(handler.createKelasMahasiswaHandler));
  router.put('/kelas-mahasiswa/:id', adminOnly, safe(handler.updateKelasMahasiswaHandler));
  router.delete('/kelas-mahasiswa/:id', adminOnly, safe(handler.deleteKelasMahasiswaHandler));

  router.get('/kelas-semester', adminOnly, safe(handler.getKelasSemesterHandler));
  router.post('/kelas-semester', adminOnly, safe(handler.createKelasSemesterHandler));
  router.put('/kelas-semester/:id', adminOnly, safe(handler.updateKelasSemesterHandler));
  router.delete('/kelas-semester/:id', adminOnly, safe(handler.deleteKelasSemesterHandler));

  router.get('/kelas-praktikum/:id/mahasiswa', adminOnly, safe(handler.getKelasPraktikumMahasiswaHandler));
  router.get('/kelas-praktikum/:id/pengampu', adminOnly, safe(handler.getKelasPraktikumPengampuHandler));
  router.get('/kelas-praktikum/:id', adminOnly, safe(handler.getKelasPraktikumByIdHandler));
  router.get('/kelas-praktikum', adminOnly, safe(handler.getKelasPraktikumHandler));
  router.post('/kelas-praktikum', adminOnly, safe(handler.createKelasPraktikumHandler));
  router.put('/kelas-praktikum/:id', adminOnly, safe(handler.updateKelasPraktikumHandler));
  router.delete('/kelas-praktikum/:id', adminOnly, safe(handler.deleteKelasPraktikumHandler));

  router.get('/pengampu/by-dosen/:id_dosen', adminOnly, safe(handler.getPengampuByDosenHandler));
  router.get('/pengampu/by-kelas-praktikum/:id_kelas_praktikum', adminOnly, safe(handler.getPengampuByKelasPraktikumHandler));
  router.get('/pengampu', adminOnly, safe(handler.getPengampuHandler));
  router.post('/pengampu', adminOnly, safe(handler.createPengampuHandler));
  router.put('/pengampu/:id', adminOnly, safe(handler.updatePengampuHandler));
  router.delete('/pengampu/:id', adminOnly, safe(handler.deletePengampuHandler));

  return router;
};

module.exports = routes;
