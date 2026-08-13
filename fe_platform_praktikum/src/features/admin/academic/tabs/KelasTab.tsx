import { AdminActionCell, AdminButton, AdminTable, EmptyState } from "../../components/AdminUI"
import type { KelasMaster } from "../../../../services/admin/academicData/service"
import type { AcademicItem, NativeTab } from "../types"

interface KelasTabProps {
  data: KelasMaster[]
  page: number
  limit: number
  submitting: boolean
  onOpenModal: (tab: NativeTab, item?: AcademicItem) => void
  onSetDeleteTarget: (target: { tab: NativeTab; id: string; label: string }) => void
}

export default function KelasTab({
  data,
  page,
  limit,
  submitting,
  onOpenModal,
  onSetDeleteTarget,
}: KelasTabProps) {
  if (!data.length) {
    return <EmptyState title="Belum ada data Kelas." />
  }

  const displayedData = data.slice((page - 1) * limit, page * limit)

  return (
    <AdminTable
      variant="compact"
      headers={[
        { text: "Nama Kelas / Rombel", align: "center" },
        { text: "Aksi", align: "right" },
      ]}
    >
      {displayedData.map((i) => (
        <tr key={i.id} className="hover:bg-blue-50/20 transition-colors">
          <td className="px-4 py-3 font-semibold text-center text-gray-900">Kelas {i.kelas}</td>
          <AdminActionCell>
            <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenModal("kelas", i)}>
              Edit
            </AdminButton>
            <AdminButton
              variant="danger"
              className="h-8 px-2"
              disabled={submitting}
              onClick={() => onSetDeleteTarget({ tab: "kelas", id: i.id, label: `Kelas ${i.kelas}` })}
            >
              Hapus
            </AdminButton>
          </AdminActionCell>
        </tr>
      ))}
    </AdminTable>
  )
}
