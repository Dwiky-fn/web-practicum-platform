import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Loader2, X } from "lucide-react"
import { AdminButton, AdminModal, AdminSelect } from "../../components/AdminUI"
import {
  academicDataApi,
  type KelasMahasiswa,
  type KelasMaster,
  type KelasSemester,
  type SemesterMaster,
  type TahunSemester,
} from "../../../../services/admin/academicData/service"
import type { GroupedKelasMahasiswaItem } from "./KelasMahasiswaTab"
import { formatKelasMahasiswaName } from "../types"
import { toast } from "../../../../components/toast/toastStore"

interface KenaikanSemesterModalProps {
  isOpen: boolean
  groupedKelasMahasiswa: GroupedKelasMahasiswaItem[]
  scopedKelasMahasiswa: KelasMahasiswa[]
  kelasSemester: KelasSemester[]
  semester: SemesterMaster[]
  kelas: KelasMaster[]
  tahunSemester: TahunSemester[]
  initialSourceKsId?: string
  initialTargetKsId?: string
  onClose: () => void
  onSuccess: () => Promise<void>
}

export interface TargetClassOption {
  id: string
  id_tahun_semester: string
  id_semester: string
  id_kelas: string
  kelasName: string
  isAutoCreate: boolean
  label: string
}

export default function KenaikanSemesterModal({
  isOpen,
  groupedKelasMahasiswa = [],
  scopedKelasMahasiswa = [],
  kelasSemester = [],
  semester = [],
  kelas = [],
  tahunSemester = [],
  initialSourceKsId = "",
  onClose,
  onSuccess,
}: KenaikanSemesterModalProps) {
  const [promotionSourceKsId, setPromotionSourceKsId] = useState<string>(initialSourceKsId)
  const [promotionTargetKsId, setPromotionTargetKsId] = useState<string>("")
  const [checkedSourceStudentIds, setCheckedSourceStudentIds] = useState<string[]>([])
  const [promotedStudentsMap, setPromotedStudentsMap] = useState<
    Record<string, { student: KelasMahasiswa; targetKsId: string; targetLabel: string }>
  >({})
  const [submittingPromotion, setSubmittingPromotion] = useState(false)
  const [promotionSubmitError, setPromotionSubmitError] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  const sourceGroup = groupedKelasMahasiswa.find((g) => g.id === promotionSourceKsId) ?? null
  const sourceSemesterNum = sourceGroup ? Number(sourceGroup.semester_num) : 0
  const targetSemesterNum = sourceSemesterNum + 1

  const targetSemesterObj = useMemo(() => {
    if (!targetSemesterNum) return null
    return semester.find((s) => Number(s.semester) === targetSemesterNum) ?? null
  }, [semester, targetSemesterNum])

  // Helper to determine next Tahun Semester string representation
  const nextTahunSemesterStr = useMemo(() => {
    if (!sourceGroup?.tahun_semester) return ""
    const currentStr = (sourceGroup.tahun_semester || "").trim()
    const match = currentStr.match(/^(\d{4})\/(\d{4})\s+(Ganjil|Genap)$/i)
    if (!match) return ""
    const tahunAwal = Number(match[1])
    const tahunAkhir = Number(match[2])
    const type = match[3].toLowerCase()

    if (type === "ganjil") {
      return `${tahunAwal}/${tahunAkhir} Genap`
    } else {
      return `${tahunAkhir}/${tahunAkhir + 1} Ganjil`
    }
  }, [sourceGroup])

  const targetTahunSemesterObj = useMemo(() => {
    if (!nextTahunSemesterStr) return null
    return (tahunSemester || []).find(
      (t) => (t?.tahun_semester || "").trim().toLowerCase() === nextTahunSemesterStr.toLowerCase()
    ) ?? null
  }, [tahunSemester, nextTahunSemesterStr])

  // Build target options for ALL master classes in targetSemesterNum
  const targetOptions = useMemo<TargetClassOption[]>(() => {
    if (!sourceGroup || !targetSemesterObj || !targetTahunSemesterObj) return []
    const targetTahunSemesterId = targetTahunSemesterObj.id

    return kelas.map((k) => {
      const existing = kelasSemester.find(
        (ks) =>
          ks.id_tahun_semester === targetTahunSemesterId &&
          ks.id_semester === targetSemesterObj.id &&
          ks.id_kelas === k.id
      )
      if (existing) {
        return {
          id: existing.id,
          id_tahun_semester: targetTahunSemesterId,
          id_semester: targetSemesterObj.id,
          id_kelas: k.id,
          kelasName: k.kelas,
          isAutoCreate: false,
          label: `Semester ${targetSemesterNum} Kelas ${k.kelas}`,
        }
      }
      return {
        id: `CREATE:${targetTahunSemesterId}:${targetSemesterObj.id}:${k.id}`,
        id_tahun_semester: targetTahunSemesterId,
        id_semester: targetSemesterObj.id,
        id_kelas: k.id,
        kelasName: k.kelas,
        isAutoCreate: true,
        label: `Semester ${targetSemesterNum} Kelas ${k.kelas}`,
      }
    })
  }, [sourceGroup, targetSemesterObj, targetTahunSemesterObj, targetSemesterNum, kelas, kelasSemester])

  // Auto-select default target class matching source class letter or first option
  useEffect(() => {
    if (!isOpen) return
    const srcId = initialSourceKsId || (groupedKelasMahasiswa[0]?.id ?? "")
    setPromotionSourceKsId(srcId)
    setCheckedSourceStudentIds([])
    setPromotedStudentsMap({})
    setPromotionSubmitError("")
    setShowPreview(false)
  }, [isOpen, initialSourceKsId, groupedKelasMahasiswa])

  useEffect(() => {
    if (!targetOptions.length) {
      setPromotionTargetKsId("")
      return
    }
    if (sourceGroup) {
      const matched = targetOptions.find((opt) => opt.id_kelas === sourceGroup.id_kelas)
      setPromotionTargetKsId(matched?.id ?? targetOptions[0]?.id ?? "")
    } else {
      setPromotionTargetKsId(targetOptions[0]?.id ?? "")
    }
  }, [sourceGroup, targetOptions])

  const groupedPreview = useMemo(() => {
    const groups: Record<string, { label: string; students: KelasMahasiswa[] }> = {}
    for (const item of Object.values(promotedStudentsMap)) {
      if (!groups[item.targetKsId]) {
        groups[item.targetKsId] = { label: item.targetLabel, students: [] }
      }
      groups[item.targetKsId].students.push(item.student)
    }
    return Object.entries(groups).map(([ksId, g]) => ({
      targetKsId: ksId,
      label: g.label,
      students: g.students,
    }))
  }, [promotedStudentsMap])

  if (!isOpen) return null

  const sourceStudents = sourceGroup
    ? scopedKelasMahasiswa.filter(
        (km) => km.id_semester === sourceGroup.id_semester && km.id_kelas === sourceGroup.id_kelas
      )
    : []

  const availableSourceStudents = sourceStudents.filter((s) => !promotedStudentsMap[s.id_mahasiswa])

  const isAllSourceChecked =
    availableSourceStudents.length > 0 &&
    availableSourceStudents.every((s) => checkedSourceStudentIds.includes(s.id_mahasiswa))

  const handleFinalize = async () => {
    const promotedEntries = Object.entries(promotedStudentsMap)
    if (!promotedEntries.length || !promotionSourceKsId) {
      toast.error("Belum ada mahasiswa yang dipindahkan ke Kolom Tujuan.")
      return
    }

    setSubmittingPromotion(true)
    setPromotionSubmitError("")
    try {
      // Collect auto-create targets (CREATE:... placeholders) and build transitions
      const autoCreateTargetsMap: Record<string, { id_tahun_semester: string; id_semester: string; id_kelas: string }> = {}
      const finalTransitions: Array<{ studentId: string; targetKelasSemesterId: string }> = []

      for (const [studentId, item] of promotedEntries) {
        if (item.targetKsId.startsWith("CREATE:")) {
          // Collect unique auto-create targets
          if (!autoCreateTargetsMap[item.targetKsId]) {
            const [, idTs, idSem, idKls] = item.targetKsId.split(":")
            autoCreateTargetsMap[item.targetKsId] = {
              id_tahun_semester: idTs,
              id_semester: idSem,
              id_kelas: idKls,
            }
          }
        }
        finalTransitions.push({
          studentId,
          targetKelasSemesterId: item.targetKsId,
        })
      }

      // Build autoCreateTargets array from collected placeholders
      const autoCreateTargets = Object.entries(autoCreateTargetsMap).map(([placeholderKey, data]) => ({
        placeholderKey,
        ...data,
      }))

      await academicDataApi.transitionStudents({
        sourceKelasSemesterId: promotionSourceKsId,
        autoCreateTargets,
        transitions: finalTransitions,
      })

      setPromotedStudentsMap({})
      setCheckedSourceStudentIds([])
      await onSuccess()
      toast.success(`${finalTransitions.length} mahasiswa berhasil dinaikkan semester!`)
      onClose()
    } catch (err) {
      console.error("[Kenaikan Semester Gagal]:", err)
      const msg = err instanceof Error ? err.message : "Gagal memproses kenaikan semester."
      setPromotionSubmitError(msg)
      toast.error(msg)
    } finally {
      setSubmittingPromotion(false)
    }
  }

  if (showPreview) {
    return (
      <AdminModal
        title="Pratinjau Rencana Kenaikan Semester"
        size="lg"
        onClose={() => {
          if (!submittingPromotion) onClose()
        }}
        footer={
          <>
            <AdminButton variant="secondary" onClick={() => setShowPreview(false)} disabled={submittingPromotion}>
              Kembali
            </AdminButton>
            <AdminButton
              onClick={handleFinalize}
              disabled={submittingPromotion}
            >
              {submittingPromotion && <Loader2 size={16} className="animate-spin" />}
              {submittingPromotion ? "Memproses Kenaikan..." : "Ya, Simpan & Finalisasikan Kenaikan"}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base mb-1">Rangkuman Kenaikan Semester</h3>
            <p className="text-xs text-gray-500">
              Berikut adalah daftar mahasiswa yang akan dipindahkan ke kelas tujuan masing-masing. Silakan periksa kembali sebelum menyimpan.
            </p>
          </div>

          {promotionSubmitError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
              {promotionSubmitError}
            </div>
          )}

          <div className="max-h-[360px] overflow-y-auto space-y-4 pr-1">
            {groupedPreview.map((g) => (
              <div key={g.targetKsId} className="border border-blue-100 rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="bg-blue-50/60 px-4 py-2.5 border-b border-blue-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-800">Kelas Tujuan: {g.label}</span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    {g.students.length} Mahasiswa
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {g.students.map((student) => (
                    <div key={student.id_mahasiswa} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-gray-50/50">
                      <div>
                        <p className="font-bold text-gray-900">{student.fullname ?? student.id_mahasiswa}</p>
                        <p className="text-[11px] text-gray-500 font-mono">NIM: {student.nim ?? "-"}</p>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        {sourceGroup ? `${formatKelasMahasiswaName({ semester_num: sourceGroup.semester_num, kelas_name: sourceGroup.kelas_name })}` : ""} &rarr; {(g.label || "").replace(/^Semester\s+\d+\s+/, "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </AdminModal>
    )
  }

  return (
    <AdminModal
      title="Proses Kenaikan Semester Mahasiswa"
      size="xl"
      onClose={() => {
        if (!submittingPromotion) onClose()
      }}
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose} disabled={submittingPromotion}>
            Batal
          </AdminButton>
          <AdminButton
            onClick={() => setShowPreview(true)}
            disabled={submittingPromotion || Object.keys(promotedStudentsMap).length === 0}
          >
            Lanjut ke Pratinjau &amp; Simpan
          </AdminButton>
        </>
      }
    >
      <div className="space-y-5">
        {promotionSubmitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {promotionSubmitError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 items-stretch">
          {/* KOLOM 1: KELAS ASAL & DAFTAR MAHASISWA */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">1. Kelas Asal</h3>
                <p className="text-xs text-gray-500">Pilih kelas &amp; mahasiswa yang akan dinaikkan</p>
              </div>
              {sourceGroup && (
                <span className="inline-flex items-center rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  Semester {sourceGroup.semester_num}
                </span>
              )}
            </div>

            {/* Dropdown Kelas Asal */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pilih Kelas / Rombel Asal</label>
              <AdminSelect
                value={promotionSourceKsId}
                onChange={(v) => {
                  setPromotionSourceKsId(v)
                  setCheckedSourceStudentIds([])
                  setPromotedStudentsMap({})
                }}
              >
                <option value="">-- Pilih Kelas Asal --</option>
                {groupedKelasMahasiswa.map((g) => (
                  <option key={g.id} value={g.id}>
                    {formatKelasMahasiswaName({ semester_num: g.semester_num, kelas_name: g.kelas_name })} (Semester {g.semester_num})
                  </option>
                ))}
              </AdminSelect>
            </div>

            {/* Toolbar & Select All */}
            {sourceGroup && availableSourceStudents.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50/50 px-3 py-2.5 rounded-lg border border-blue-100 text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-gray-800">
                  <input
                    type="checkbox"
                    checked={isAllSourceChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCheckedSourceStudentIds(availableSourceStudents.map((s) => s.id_mahasiswa))
                      } else {
                        setCheckedSourceStudentIds([])
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pilih Semua ({availableSourceStudents.length})</span>
                </label>
                <span className="text-blue-700 font-bold">{checkedSourceStudentIds.length} dipilih</span>
              </div>
            )}

            {/* Student List Box (Column 1) */}
            <div className="h-72 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
              {!promotionSourceKsId ? (
                <div className="h-full flex items-center justify-center p-6 text-center text-xs text-gray-500">
                  Pilih kelas asal terlebih dahulu.
                </div>
              ) : !availableSourceStudents.length ? (
                <div className="h-full flex items-center justify-center p-6 text-center text-xs text-gray-500">
                  {sourceStudents.length === 0
                    ? "Belum ada mahasiswa di kelas ini."
                    : "Seluruh mahasiswa telah dipindahkan ke Kolom Tujuan."}
                </div>
              ) : (
                availableSourceStudents.map((student) => {
                  const isChecked = checkedSourceStudentIds.includes(student.id_mahasiswa)
                  return (
                    <label
                      key={student.id_mahasiswa}
                      className={`flex items-center justify-between p-3 cursor-pointer text-xs transition-colors hover:bg-blue-50/60 ${isChecked ? "bg-blue-50/80 font-medium" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCheckedSourceStudentIds((prev) => [...prev, student.id_mahasiswa])
                            } else {
                              setCheckedSourceStudentIds((prev) => prev.filter((id) => id !== student.id_mahasiswa))
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-bold text-gray-900">{student.fullname ?? student.id_mahasiswa}</p>
                          <p className="text-[11px] text-gray-500 font-mono">NIM: {student.nim ?? "-"}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 border border-green-200">
                        Aktif
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {/* TOMBOL AKSI TENGAH: NAIKKAN TO COLUMN 2 */}
          <div className="flex flex-col items-center justify-center gap-2 self-center py-4">
            <AdminButton
              variant="primary"
              className="w-full md:w-auto px-4 py-2.5 flex items-center justify-center gap-2 shadow-md text-xs font-bold whitespace-nowrap"
              disabled={checkedSourceStudentIds.length === 0 || !promotionTargetKsId}
              onClick={() => {
                if (!promotionTargetKsId || !checkedSourceStudentIds.length) return
                const selectedOpt = targetOptions.find((opt) => opt.id === promotionTargetKsId)
                const targetLabel = selectedOpt ? selectedOpt.label : "Kelas Tujuan"

                const newPromoted = { ...promotedStudentsMap }
                checkedSourceStudentIds.forEach((studentId) => {
                  const student = sourceStudents.find((s) => s.id_mahasiswa === studentId)
                  if (student) {
                    newPromoted[studentId] = {
                      student,
                      targetKsId: promotionTargetKsId,
                      targetLabel,
                    }
                  }
                })
                setPromotedStudentsMap(newPromoted)
                setCheckedSourceStudentIds([])
              }}
            >
              <span>Naikkan ({checkedSourceStudentIds.length})</span>
              <ArrowRight size={16} />
            </AdminButton>
          </div>

          {/* KOLOM 2: KELAS TUJUAN & MAHASISWA NAIK SEMESTER */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">2. Kelas Tujuan</h3>
                <p className="text-xs text-gray-500">Mahasiswa yang akan dinaikkan semester</p>
              </div>
              {sourceGroup && (
                <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-700/10">
                  Semester {targetSemesterNum}
                </span>
              )}
            </div>

            {/* Dropdown Kelas Tujuan */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Pilih Kelas Tujuan (Semester {sourceGroup ? targetSemesterNum : "?"})
              </label>
              <AdminSelect
                value={promotionTargetKsId}
                onChange={setPromotionTargetKsId}
                disabled={!sourceGroup || !targetSemesterObj || !targetTahunSemesterObj}
              >
                <option value="">
                  {!sourceGroup
                    ? "-- Pilih Kelas Asal Terlebih Dahulu --"
                    : !targetSemesterObj
                      ? `Master Semester ${targetSemesterNum} belum terdaftar di sistem`
                      : !targetTahunSemesterObj
                        ? `Tahun Semester berikutnya (${nextTahunSemesterStr}) belum terdaftar`
                        : `-- Pilih Kelas Tujuan (Semester ${targetSemesterNum}) --`}
                </option>
                {targetOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </AdminSelect>
              {sourceGroup && !targetSemesterObj && (
                <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ Master Semester {targetSemesterNum} belum terdaftar. Silakan tambahkan master semester terlebih dahulu pada tab Semester.
                </p>
              )}
              {sourceGroup && targetSemesterObj && !targetTahunSemesterObj && nextTahunSemesterStr && (
                <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  ⚠️ Periode Akademik berikutnya ({nextTahunSemesterStr}) belum terdaftar. Silakan tambahkan tahun semester tersebut terlebih dahulu pada tab Tahun Semester.
                </p>
              )}
            </div>

            {/* Counter & Kosongkan Kolom 2 */}
            {Object.keys(promotedStudentsMap).length > 0 && (
              <div className="flex items-center justify-between bg-emerald-50 px-3 py-2.5 rounded-lg border border-emerald-200 text-xs">
                <span className="text-emerald-800 font-bold">{Object.keys(promotedStudentsMap).length} mahasiswa siap dinaikkan</span>
                <button
                  type="button"
                  className="text-red-600 hover:text-red-800 font-bold text-[11px] underline"
                  onClick={() => setPromotedStudentsMap({})}
                >
                  Kosongkan Semua
                </button>
              </div>
            )}

            {/* Student List Box (Column 2) - Filtered by selected target class */}
            <div className="h-72 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              {(() => {
                // Filter students for the currently selected target class
                const filteredEntries = Object.entries(promotedStudentsMap).filter(
                  ([, item]) => item.targetKsId === promotionTargetKsId
                )
                const totalCount = Object.keys(promotedStudentsMap).length

                if (totalCount === 0) {
                  return (
                    <div className="h-full flex items-center justify-center p-6 text-center text-xs text-gray-500">
                      Belum ada mahasiswa dipindahkan ke kolom ini. Pilih mahasiswa di Kolom 1 lalu klik &quot;Naikkan →&quot;.
                    </div>
                  )
                }

                if (!promotionTargetKsId) {
                  return (
                    <div className="h-full flex items-center justify-center p-6 text-center text-xs text-gray-500">
                      Pilih Kelas Tujuan di atas untuk melihat daftar mahasiswa.
                    </div>
                  )
                }

                if (filteredEntries.length === 0) {
                  return (
                    <div className="h-full flex items-center justify-center p-6 text-center text-xs text-gray-500">
                      Belum ada mahasiswa untuk kelas tujuan ini. Pilih mahasiswa di Kolom 1 lalu klik &quot;Naikkan →&quot;.
                    </div>
                  )
                }

                return (
                  <>
                    {/* Students */}
                    {filteredEntries.map(([studentId, item]) => (
                      <div key={studentId} className="flex items-center justify-between p-3 text-xs hover:bg-gray-50/80 transition-colors border-b border-gray-100 last:border-b-0">
                        <div>
                          <p className="font-bold text-gray-900">{item.student.fullname ?? item.student.id_mahasiswa}</p>
                          <p className="text-[11px] text-gray-500 font-mono">NIM: {item.student.nim ?? "-"}</p>
                        </div>
                        <button
                          type="button"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Batalkan mahasiswa ini"
                          onClick={() => {
                            const newPromoted = { ...promotedStudentsMap }
                            delete newPromoted[studentId]
                            setPromotedStudentsMap(newPromoted)
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  )
}
