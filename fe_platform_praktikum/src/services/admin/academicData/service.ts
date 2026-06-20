import { apiFetch } from "../../api"
import { queryString } from "../query"

export type AcademicStatus = "active" | "inactive" | "archived"
export type KelasPraktikumStatus = "draft" | "open" | "closed" | "archived"
export type MataKuliahTipe = "teori" | "praktikum" | "teori_praktikum"
export type PengampuPeran = "utama" | "asisten" | "pengganti"

export type TahunSemester = {
  id: string
  tahun_semester: string
  status: AcademicStatus
}

export type Kurikulum = {
  id: string
  tahun_kurikulum: string
  nama_kurikulum: string
  status: AcademicStatus
}

export type SemesterMaster = {
  id: string
  semester: number
}

export type KelasMaster = {
  id: string
  kelas: string
}

export type MataKuliah = {
  id: string
  kode_mk: string
  nama_mk: string
  sks: number
  tipe: MataKuliahTipe
  id_kurikulum: string
  id_semester: string
  nama_kurikulum?: string
  semester?: number
}

export type KelasMahasiswa = {
  id: string
  id_tahun_semester: string
  id_semester: string
  id_kelas: string
  id_mahasiswa: string
  status: AcademicStatus
  tahun_semester?: string
  semester?: number
  kelas?: string
  nim?: string
  fullname?: string
}

export type KelasSemester = {
  id: string
  id_tahun_semester: string
  id_semester: string
  id_kelas: string
  semester?: number
  kelas?: string
  nama_kelas?: string
  jumlah_mahasiswa: number
  status: AcademicStatus
  tahun_semester?: string
}

export type KelasPraktikum = {
  id: string
  id_tahun_semester: string
  id_mata_kuliah: string
  id_semester: string
  id_kelas: string
  nama_kelas: string
  status: KelasPraktikumStatus
  tahun_semester?: string
  kode_mk?: string
  nama_mk?: string
  semester?: number
  kelas?: string
}

export type Pengampu = {
  id: string
  id_kelas_praktikum: string
  id_dosen: string
  peran: PengampuPeran
  nama_kelas?: string
  nama_mk?: string
  nama_dosen?: string
  fullname?: string
  nip?: string
}

export type KelasPraktikumMahasiswa = {
  id: string
  id_tahun_semester: string
  id_semester: string
  id_kelas: string
  id_mahasiswa: string
  status: AcademicStatus
  fullname?: string
  email?: string
  nim?: string
}

const unwrap = <T>(res: any, key: string): T => res.data[key] ?? []

export const academicDataApi = {
  async getTahunSemester() {
    return unwrap<TahunSemester[]>(await apiFetch("/admin/tahun-semester"), "tahun_semester")
  },
  async createTahunSemester(payload: Partial<TahunSemester>) {
    return unwrap<TahunSemester>(await apiFetch("/admin/tahun-semester", { method: "POST", body: JSON.stringify(payload) }), "tahun_semester")
  },
  async updateTahunSemester(id: string, payload: Partial<TahunSemester>) {
    return unwrap<TahunSemester>(await apiFetch(`/admin/tahun-semester/${id}`, { method: "PUT", body: JSON.stringify(payload) }), "tahun_semester")
  },
  async activateTahunSemester(id: string) {
    return unwrap<TahunSemester>(await apiFetch(`/admin/tahun-semester/${id}/activate`, { method: "PATCH" }), "tahun_semester")
  },
  async deleteTahunSemester(id: string, force?: boolean) {
    await apiFetch(`/admin/tahun-semester/${id}${force ? "?force=true" : ""}`, { method: "DELETE" })
  },

  async getKurikulum() {
    return unwrap<Kurikulum[]>(await apiFetch("/admin/kurikulum"), "kurikulum")
  },
  async createKurikulum(payload: Partial<Kurikulum>) {
    return unwrap<Kurikulum>(await apiFetch("/admin/kurikulum", { method: "POST", body: JSON.stringify(payload) }), "kurikulum")
  },
  async updateKurikulum(id: string, payload: Partial<Kurikulum>) {
    return unwrap<Kurikulum>(await apiFetch(`/admin/kurikulum/${id}`, { method: "PUT", body: JSON.stringify(payload) }), "kurikulum")
  },
  async activateKurikulum(id: string) {
    return unwrap<Kurikulum>(await apiFetch(`/admin/kurikulum/${id}/activate`, { method: "PATCH" }), "kurikulum")
  },
  async deleteKurikulum(id: string, force?: boolean) {
    await apiFetch(`/admin/kurikulum/${id}${force ? "?force=true" : ""}`, { method: "DELETE" })
  },

  async getSemester() {
    return unwrap<SemesterMaster[]>(await apiFetch("/admin/semester"), "semester")
  },
  async saveSemester(payload: Partial<SemesterMaster>, id?: string) {
    const method = id ? "PUT" : "POST"
    const path = id ? `/admin/semester/${id}` : "/admin/semester"
    return unwrap<SemesterMaster>(await apiFetch(path, { method, body: JSON.stringify(payload) }), "semester")
  },
  async deleteSemester(id: string, force?: boolean) {
    await apiFetch(`/admin/semester/${id}${force ? "?force=true" : ""}`, { method: "DELETE" })
  },

  async getKelas() {
    return unwrap<KelasMaster[]>(await apiFetch("/admin/kelas"), "kelas")
  },
  async saveKelas(payload: Partial<KelasMaster>, id?: string) {
    const method = id ? "PUT" : "POST"
    const path = id ? `/admin/kelas/${id}` : "/admin/kelas"
    return unwrap<KelasMaster>(await apiFetch(path, { method, body: JSON.stringify(payload) }), "kelas")
  },
  async deleteKelas(id: string, force?: boolean) {
    await apiFetch(`/admin/kelas/${id}${force ? "?force=true" : ""}`, { method: "DELETE" })
  },

  async getMataKuliah(filters: { id_kurikulum?: string } = {}) {
    return unwrap<MataKuliah[]>(await apiFetch(`/admin/mata-kuliah${queryString(filters)}`), "mata_kuliah")
  },
  async saveMataKuliah(payload: Partial<MataKuliah>, id?: string) {
    const method = id ? "PUT" : "POST"
    const path = id ? `/admin/mata-kuliah/${id}` : "/admin/mata-kuliah"
    return unwrap<MataKuliah>(await apiFetch(path, { method, body: JSON.stringify(payload) }), "mata_kuliah")
  },
  async deleteMataKuliah(id: string, force?: boolean) {
    await apiFetch(`/admin/mata-kuliah/${id}${force ? "?force=true" : ""}`, { method: "DELETE" })
  },

  async getKelasMahasiswa(filters: Record<string, string> = {}) {
    return unwrap<KelasMahasiswa[]>(await apiFetch(`/admin/kelas-mahasiswa${queryString(filters)}`), "kelas_mahasiswa")
  },
  async saveKelasMahasiswa(payload: Partial<KelasMahasiswa>, id?: string) {
    const method = id ? "PUT" : "POST"
    const path = id ? `/admin/kelas-mahasiswa/${id}` : "/admin/kelas-mahasiswa"
    return unwrap<KelasMahasiswa>(await apiFetch(path, { method, body: JSON.stringify(payload) }), "kelas_mahasiswa")
  },
  async deleteKelasMahasiswa(id: string) {
    await apiFetch(`/admin/kelas-mahasiswa/${id}`, { method: "DELETE" })
  },

  async getKelasPraktikum(filters: Record<string, string> = {}) {
    return unwrap<KelasPraktikum[]>(await apiFetch(`/admin/kelas-praktikum${queryString(filters)}`), "kelas_praktikum")
  },
  async getKelasPraktikumById(id: string) {
    return unwrap<KelasPraktikum>(await apiFetch(`/admin/kelas-praktikum/${id}`), "kelas_praktikum")
  },
  async getKelasPraktikumMahasiswa(id: string) {
    return unwrap<KelasPraktikumMahasiswa[]>(await apiFetch(`/admin/kelas-praktikum/${id}/mahasiswa`), "mahasiswa")
  },
  async getKelasPraktikumPengampu(id: string) {
    return unwrap<Pengampu[]>(await apiFetch(`/admin/kelas-praktikum/${id}/pengampu`), "pengampu")
  },
  async saveKelasPraktikum(payload: Partial<KelasPraktikum>, id?: string) {
    const method = id ? "PUT" : "POST"
    const path = id ? `/admin/kelas-praktikum/${id}` : "/admin/kelas-praktikum"
    return unwrap<KelasPraktikum>(await apiFetch(path, { method, body: JSON.stringify(payload) }), "kelas_praktikum")
  },
  async deleteKelasPraktikum(id: string) {
    await apiFetch(`/admin/kelas-praktikum/${id}`, { method: "DELETE" })
  },

  async getPengampu(filters: Record<string, string> = {}) {
    return unwrap<Pengampu[]>(await apiFetch(`/admin/pengampu${queryString(filters)}`), "pengampu")
  },
  async savePengampu(payload: Partial<Pengampu>, id?: string) {
    const method = id ? "PUT" : "POST"
    const path = id ? `/admin/pengampu/${id}` : "/admin/pengampu"
    return unwrap<Pengampu>(await apiFetch(path, { method, body: JSON.stringify(payload) }), "pengampu")
  },
  async deletePengampu(id: string) {
    await apiFetch(`/admin/pengampu/${id}`, { method: "DELETE" })
  },

  async getKelasSemester(filters: Record<string, string> = {}) {
    return unwrap<KelasSemester[]>(await apiFetch(`/admin/kelas-semester${queryString(filters)}`), "kelas_semester")
  },
  async saveKelasSemester(payload: Partial<KelasSemester>, id?: string) {
    const method = id ? "PUT" : "POST"
    const path = id ? `/admin/kelas-semester/${id}` : "/admin/kelas-semester"
    return unwrap<KelasSemester>(await apiFetch(path, { method, body: JSON.stringify(payload) }), "kelas_semester")
  },
  async deleteKelasSemester(id: string) {
    await apiFetch(`/admin/kelas-semester/${id}`, { method: "DELETE" })
  },
  async transitionStudents(payload: {
    targetTahunSemesterId: string
    transitions: Array<{
      studentId: string
      action: "promote" | "retain" | "cuti" | "drop"
      targetSemesterId?: string
      targetKelasId?: string
    }>
  }) {
    await apiFetch("/admin/kelas-semester/transition", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },
}
