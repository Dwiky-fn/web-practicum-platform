import { AdminActionCell, AdminButton, AdminTable, EmptyState } from "../../components/AdminUI"
import type { SemesterMaster } from "../../../../services/admin/academicData/service"
import type { AcademicItem, NativeTab } from "../types"

interface SemesterTabProps {
  data: SemesterMaster[]
  page: number
  limit: number
  submitting: boolean
  onOpenModal: (tab: NativeTab, item?: AcademicItem) => void
  onSetDeleteTarget: (target: { tab: NativeTab; id: string; label: string }) => void
}

export default function SemesterTab({
  data,
  page,
  limit,
  submitting,
  onOpenModal,
  onSetDeleteTarget,
}: SemesterTabProps) {
  if (!data.length) {
    return <EmptyState title="Belum ada data Semester." />
  }

  const displayedData = data.slice((page - 1) * limit, page * limit)

  return (
    <AdminTable
      variant="compact"
      headers={[
        { text: "Semester", align: "center" },
        { text: "Aksi", align: "right" },
      ]}
    >
      {displayedData.map((i) => (
        <tr key={i.id} className="hover:bg-blue-50/20 transition-colors">
          <td className="px-4 py-3 font-semibold text-center text-gray-900">Semester {i.semester}</td>
          <AdminActionCell>
            <AdminButton variant="ghost" className="h-8 px-2" onClick={() => onOpenModal("semester", i)}>
              Edit
            </AdminButton>
            <AdminButton
              variant="danger"
              className="h-8 px-2"
              disabled={submitting}
              onClick={() => onSetDeleteTarget({ tab: "semester", id: i.id, label: `Semester ${i.semester}` })}
            >
              Hapus
            </AdminButton>
          </AdminActionCell>
        </tr>
      ))}
    </AdminTable>
  )
}
