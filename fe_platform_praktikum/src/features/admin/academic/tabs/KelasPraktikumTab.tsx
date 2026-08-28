import { Eye } from "lucide-react"
import { AdminActionCell, AdminButton, AdminTable, EmptyState } from "../../components/AdminUI"
import type { KelasPraktikum, Pengampu } from "../../../../services/admin/academicData/service"
import type { AcademicItem, NativeTab } from "../types"
import { formatKelasPraktikumName } from "../types"

interface KelasPraktikumTabProps {
  data: KelasPraktikum[]
  pengampu: Pengampu[]
  page: number
  limit: number
  submitting: boolean
  isDetailView?: boolean
  onOpenDetail: (item: KelasPraktikum) => void
  onOpenModal: (tab: NativeTab, item?: AcademicItem) => void
  onSetDeleteTarget: (target: { tab: NativeTab; id: string; label: string }) => void
}

export default function KelasPraktikumTab({
  data,
  pengampu,
  page,
  limit,
  submitting,
  isDetailView = false,
  onOpenDetail,
  onOpenModal,
  onSetDeleteTarget,
}: KelasPraktikumTabProps) {
  if (!data.length) {
    return <EmptyState title="Belum ada data Kelas Praktikum." />
  }

  const displayedData = data.slice((page - 1) * limit, page * limit)

  const headers = isDetailView
    ? [
        { text: "Mata Kuliah", align: "left" as const },
        { text: "Dosen Pengampu", align: "left" as const },
        { text: "Aksi", align: "right" as const },
      ]
    : [
        { text: "Nama Kelas Praktikum", align: "left" as const },
        { text: "Semester", align: "center" as const },
        { text: "Kelas", align: "center" as const },
        { text: "Pengampu", align: "left" as const },
        { text: "Aksi", align: "right" as const },
      ]

  return (
    <AdminTable variant="full" headers={headers}>
      {displayedData.map((i) => {
        const lecturersForClass = pengampu.filter((item) => item.id_kelas_praktikum === i.id)
        const displayClassName = formatKelasPraktikumName(i)
        return (
          <tr key={i.id} className="hover:bg-blue-50/20 transition-colors">
            <td className="px-4 py-3 font-semibold text-left text-gray-900">{displayClassName}</td>
            {!isDetailView && <td className="px-4 py-3 text-center text-gray-600">{i.semester}</td>}
            {!isDetailView && <td className="px-4 py-3 text-center font-semibold text-gray-800">{i.kelas}</td>}
            <td className="px-4 py-3 text-left text-gray-600">
              {lecturersForClass.map((item) => item.nama_dosen ?? item.fullname ?? item.id_dosen).join(", ") || "-"}
            </td>
            <AdminActionCell>
              <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenDetail(i)}>
                <Eye size={14} />
                Detail
              </AdminButton>
              <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenModal("kelas-praktikum", i)}>
                Edit
              </AdminButton>
              <AdminButton
                variant="danger"
                className="h-8 px-2"
                disabled={submitting}
                onClick={() => onSetDeleteTarget({ tab: "kelas-praktikum", id: i.id, label: displayClassName })}
              >
                Hapus
              </AdminButton>
            </AdminActionCell>
          </tr>
        )
      })}
    </AdminTable>
  )
}
