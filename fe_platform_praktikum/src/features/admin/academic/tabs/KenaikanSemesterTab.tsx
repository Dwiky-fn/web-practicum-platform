import React from "react"
import { ArrowUpRight } from "lucide-react"
import { AdminButton, AdminTable, EmptyState } from "../../components/AdminUI"
import type { GroupedKelasMahasiswaItem } from "./KelasMahasiswaTab"
import { formatKelasMahasiswaName } from "../types"

interface KenaikanSemesterTabProps {
  groupedData: GroupedKelasMahasiswaItem[]
  loading: boolean
  statusBadgeIndo: (status?: string) => React.ReactNode
  onOpenPromotionModal: (sourceGroup: GroupedKelasMahasiswaItem) => void
}

export default function KenaikanSemesterTab({
  groupedData,
  loading,
  statusBadgeIndo,
  onOpenPromotionModal,
}: KenaikanSemesterTabProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded-lg" />
        ))}
      </div>
    )
  }

  if (!groupedData.length) {
    return <EmptyState title="Belum ada data Kenaikan Semester." />
  }

  return (
    <AdminTable
      variant="medium"
      headers={[
        { text: "Nama Kelas / Rombel", align: "left" },
        { text: "Semester", align: "center" },
        { text: "Jumlah Mahasiswa", align: "center" },
        { text: "Status Rombel", align: "center" },
        { text: "Aksi", align: "right" },
      ]}
    >
      {groupedData.map((g) => {
        const displayClassName = formatKelasMahasiswaName({ semester_num: g.semester_num, kelas_name: g.kelas_name })
        return (
          <tr key={g.id} className="hover:bg-blue-50/20 transition-colors">
            <td className="px-4 py-3 font-semibold text-left text-gray-900">{displayClassName}</td>
            <td className="px-4 py-3 text-center text-gray-700 font-medium">Semester {g.semester_num}</td>
            <td className="px-4 py-3 text-center text-gray-600 font-semibold">{g.jumlah_mahasiswa} Mahasiswa</td>
            <td className="px-4 py-3 text-center">{statusBadgeIndo(g.status)}</td>
            <td className="px-4 py-3 text-right">
              <AdminButton
                variant="primary"
                className="h-8 px-3 text-xs"
                onClick={() => onOpenPromotionModal(g)}
              >
                <ArrowUpRight size={14} />
                Atur Kenaikan Semester
              </AdminButton>
            </td>
          </tr>
        )
      })}
    </AdminTable>
  )
}
