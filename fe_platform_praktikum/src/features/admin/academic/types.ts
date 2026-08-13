import type {
  KelasMahasiswa,
  KelasMaster,
  KelasPraktikum,
  KelasSemester,
  Kurikulum,
  MataKuliah,
  SemesterMaster,
  TahunSemester,
} from "../../../services/admin/academicData/service"

export type NativeTab =
  | "tahun"
  | "kurikulum"
  | "semester"
  | "kelas"
  | "mata-kuliah"
  | "kelas-mahasiswa"
  | "kelas-praktikum"
  | "kenaikan-semester"

export type FormState = Record<string, string>

export type AcademicItem =
  | TahunSemester
  | Kurikulum
  | SemesterMaster
  | KelasMaster
  | MataKuliah
  | KelasMahasiswa
  | KelasSemester
  | KelasPraktikum

export type EditingState = { tab: NativeTab; item?: AcademicItem } | null
export type ActivateTarget = { tab: NativeTab; id?: string; label: string; pendingForm?: FormState } | null
export type DeleteTarget = { tab: NativeTab; id: string; label: string } | null

export function formatKelasMahasiswaName(item: { semester_num?: number | string; kelas_name?: string; semester?: number | string; kelas?: string }) {
  const sem = item.semester_num ?? item.semester ?? ""
  const kls = item.kelas_name ?? item.kelas ?? ""
  if (!sem && !kls) return "Kelas Mahasiswa"
  if (!sem) return `Kelas ${kls}`
  if (!kls) return `Semester ${sem}`
  return `${sem}${kls}`
}

export function formatKelasPraktikumName(item: { nama_mk?: string; semester?: number | string; kelas?: string }) {
  const mk = item.nama_mk ?? ""
  const sem = item.semester ?? ""
  const kls = item.kelas ?? ""
  if (!mk && !sem && !kls) return "Kelas Praktikum"
  if (!sem && !kls) return mk
  return `${mk} - ${sem}${kls}`
}

export function getStatusLabel(status?: string) {
  const map: Record<string, string> = {
    active: "Aktif",
    inactive: "Nonaktif",
    archived: "Diarsipkan",
    draft: "Draf",
    open: "Buka",
    closed: "Tutup",
  }
  return map[status ?? ""] ?? status ?? "-"
}

export function includesKeyword(values: Array<string | number | undefined>, keyword: string) {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalized))
}
