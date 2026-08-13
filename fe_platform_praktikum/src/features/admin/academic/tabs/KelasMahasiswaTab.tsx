import React from "react"
import { Eye } from "lucide-react"
import { AdminActionCell, AdminButton, AdminTable, EmptyState } from "../../components/AdminUI"
import type { AcademicItem, NativeTab } from "../types"
import { formatKelasMahasiswaName } from "../types"

export interface GroupedKelasMahasiswaItem {
  id: string
  id_tahun_semester: string
  id_semester: string
  id_kelas: string
  jumlah_mahasiswa: number
  status: string
  tahun_semester?: string
  semester_num?: number | string
  kelas_name?: string
}

interface KelasMahasiswaTabProps {
  groupedData: GroupedKelasMahasiswaItem[]
  page: number
  limit: number
  submitting: boolean
  statusBadgeIndo: (status?: string) => React.ReactNode
  onOpenDetail: (group: GroupedKelasMahasiswaItem) => void
  onOpenModal: (tab: NativeTab, item?: AcademicItem) => void
  onSetDeleteTarget: (target: { tab: NativeTab; id: string; label: string }) => void
}

export default function KelasMahasiswaTab({
  groupedData,
  page,
  limit,
  submitting,
  statusBadgeIndo,
  onOpenDetail,
  onOpenModal,
  onSetDeleteTarget,
}: KelasMahasiswaTabProps) {
  if (!groupedData.length) {
    return <EmptyState title="Belum ada data Kelas Mahasiswa." />
  }

  const displayedData = groupedData.slice((page - 1) * limit, page * limit)

  return (
    <AdminTable
      variant="full"
      headers={[
        { text: "Nama Kelas", align: "left" },
        { text: "Jumlah Mahasiswa", align: "center" },
        { text: "Status Rombel", align: "center" },
        { text: "Aksi", align: "right" },
      ]}
    >
      {displayedData.map((g) => {
        const displayClassName = formatKelasMahasiswaName({ semester_num: g.semester_num, kelas_name: g.kelas_name })
        return (
          <tr key={g.id} className="hover:bg-blue-50/20 transition-colors">
            <td className="px-4 py-3 font-semibold text-left text-gray-900">{displayClassName}</td>
            <td className="px-4 py-3 text-center text-gray-600 font-semibold">{g.jumlah_mahasiswa} Mahasiswa</td>
            <td className="px-4 py-3 text-center">{statusBadgeIndo(g.status)}</td>
            <AdminActionCell>
              <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenDetail(g)}>
                <Eye size={14} />
                Detail Mahasiswa
              </AdminButton>
              <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenModal("kelas-mahasiswa", g as unknown as AcademicItem)}>
                Edit
              </AdminButton>
              <AdminButton
                variant="danger"
                className="h-8 px-2"
                disabled={submitting}
                onClick={() => onSetDeleteTarget({ tab: "kelas-mahasiswa", id: g.id, label: displayClassName })}
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
